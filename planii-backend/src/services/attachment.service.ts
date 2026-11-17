import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import type { Request } from 'express'
import { env } from '../config/env'
import { HttpError, fail } from '../core/http-error'
import { q, one, many } from '../db/pool'
import { uid } from '../lib/utils'
import type { DbUser } from '../models/User.model'
import * as TaskModel from '../models/Task.model'
import * as ProjectModel from '../models/Project.model'
import { assertProjectOpen } from './project.service'
import { recordTaskEvent, notify, notifyProject } from './notification.service'

/* ───────── Types de fichiers acceptés ─────────
   Liste blanche par extension. Le type MIME envoyé par le client n'est JAMAIS utilisé :
   on le déduit de l'extension, et on vérifie les premiers octets du fichier. Pas de
   HTML/SVG/JS/exécutables : ils pourraient s'exécuter dans le navigateur depuis notre domaine. */

const OLE = [0xd0, 0xcf, 0x11, 0xe0] // .doc .xls .ppt (anciens formats Office)
const ZIP = [0x50, 0x4b] // .docx .xlsx .pptx .odt .zip (conteneurs ZIP)
const starts = (...sig: number[]) => (b: Buffer) => sig.every((x, i) => b[i] === x)

interface FileType {
  mime: string
  /** Affichable dans le navigateur sans téléchargement (images + PDF uniquement). */
  inline?: boolean
  sniff?: (head: Buffer) => boolean
}

const TYPES: Record<string, FileType> = {
  pdf: { mime: 'application/pdf', inline: true, sniff: starts(0x25, 0x50, 0x44, 0x46) },
  doc: { mime: 'application/msword', sniff: starts(...OLE) },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sniff: starts(...ZIP) },
  xls: { mime: 'application/vnd.ms-excel', sniff: starts(...OLE) },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sniff: starts(...ZIP) },
  ppt: { mime: 'application/vnd.ms-powerpoint', sniff: starts(...OLE) },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', sniff: starts(...ZIP) },
  odt: { mime: 'application/vnd.oasis.opendocument.text', sniff: starts(...ZIP) },
  ods: { mime: 'application/vnd.oasis.opendocument.spreadsheet', sniff: starts(...ZIP) },
  odp: { mime: 'application/vnd.oasis.opendocument.presentation', sniff: starts(...ZIP) },
  csv: { mime: 'text/csv; charset=utf-8' },
  txt: { mime: 'text/plain; charset=utf-8' },
  md: { mime: 'text/plain; charset=utf-8' },
  rtf: { mime: 'application/rtf', sniff: starts(0x7b, 0x5c, 0x72, 0x74, 0x66) },
  zip: { mime: 'application/zip', sniff: starts(...ZIP) },
  png: { mime: 'image/png', inline: true, sniff: starts(0x89, 0x50, 0x4e, 0x47) },
  jpg: { mime: 'image/jpeg', inline: true, sniff: starts(0xff, 0xd8, 0xff) },
  jpeg: { mime: 'image/jpeg', inline: true, sniff: starts(0xff, 0xd8, 0xff) },
  gif: { mime: 'image/gif', inline: true, sniff: starts(0x47, 0x49, 0x46, 0x38) },
  webp: { mime: 'image/webp', inline: true, sniff: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
  heic: { mime: 'image/heic', sniff: (b) => b.toString('latin1', 4, 8) === 'ftyp' }, // photos iPhone : à télécharger
}

export const ALLOWED_EXTENSIONS = Object.keys(TYPES)

/** Au plus ce nombre de fichiers par tâche (évite les tâches transformées en dépôt de fichiers). */
export const MAX_FILES_PER_TASK = 30

const extOf = (name: string) => path.extname(name).slice(1).toLowerCase()

/** multer lit le nom en latin1 : on retrouve l'UTF-8 (« résumé.pdf ») quand c'est un nom mal décodé. */
function fixName(raw: string): string {
  let name = raw
  if (/[\u0080-\u00ff]/.test(raw) && !/[^\u0000-\u00ff]/.test(raw)) {
    const utf8 = Buffer.from(raw, 'latin1').toString('utf8')
    if (!utf8.includes('\ufffd')) name = utf8
  }
  // Pas de chemin, pas de caractères de contrôle, longueur bornée (extension conservée).
  name = path.basename(name.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim()
  const ext = path.extname(name)
  const base = name.slice(0, name.length - ext.length).slice(0, 120)
  return (base || 'fichier') + ext
}

/* ───────── Stockage ─────────
   Un seul endroit sait où et comment les octets sont rangés. Aujourd'hui : disque local
   (volume Docker). Pour passer plus tard à un stockage objet (S3, R2, B2…), seules ces
   fonctions changent ; la base ne stocke qu'une `storage_key`. */

const keyPath = (key: string) => {
  const abs = path.resolve(env.attachmentsDir, key)
  const root = path.resolve(env.attachmentsDir)
  if (!abs.startsWith(root + path.sep)) throw new Error('storage_key invalide')
  return abs
}

function unlinkQuiet(key: string) {
  try { fs.rmSync(keyPath(key), { force: true }) } catch { /* ignore */ }
}

/** Supprime tous les fichiers d'un projet (appelé après suppression du projet en base). */
export function removeProjectFiles(projectId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(projectId)) return
  try { fs.rmSync(path.join(env.attachmentsDir, projectId), { recursive: true, force: true }) } catch { /* ignore */ }
}

/** Supprime des fichiers par clé (tâches supprimées). */
export function removeFiles(keys: string[]) {
  for (const k of keys) unlinkQuiet(k)
}

/* ───────── Téléversement ───────── */

interface UploadCtx { taskId: string; projectId: string }
const ctxOf = (req: Request) => (req as Request & { attCtx?: UploadCtx }).attCtx!

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(env.attachmentsDir, ctxOf(req).projectId)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (_req, _file, cb) => cb(null, uid()),
  }),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = extOf(fixName(file.originalname))
    if (!TYPES[ext]) return cb(new HttpError(415, 'Type de fichier non accepté'))
    cb(null, true)
  },
})

export const uploadSingle = upload.single('file')

async function loadForMember(taskId: string, userId: string) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, userId)
  if (!m) fail(403, 'Non membre')
  return { t, m }
}

export async function projectUsage(projectId: string): Promise<number> {
  const r = await one<{ s: string }>('SELECT COALESCE(SUM(size),0)::text AS s FROM task_attachments WHERE project_id=$1', [projectId])
  return Number(r?.s || 0)
}

/** Contrôles AVANT d'accepter le moindre octet : membre, projet ouvert, place restante. */
export async function precheck(req: Request) {
  const { t } = await loadForMember(req.params.id, req.user!.id)
  assertProjectOpen(await ProjectModel.findById(t.project_id))
  const row = await one<{ n: number }>('SELECT count(*)::int AS n FROM task_attachments WHERE task_id=$1', [t.id])
  if ((row?.n || 0) >= MAX_FILES_PER_TASK) fail(409, `Maximum ${MAX_FILES_PER_TASK} fichiers par tâche`)
  if (await projectUsage(t.project_id) >= env.projectQuotaBytes) fail(413, 'Espace de stockage du projet plein')
  ;(req as Request & { attCtx?: UploadCtx }).attCtx = { taskId: t.id, projectId: t.project_id }
}

export async function saveUploaded(req: Request, user: DbUser) {
  const file = req.file
  if (!file) fail(400, 'Fichier requis')
  const ctx = ctxOf(req)
  const id = path.basename(file.path)
  const key = `${ctx.projectId}/${id}`
  const reject = (status: number, msg: string): never => { unlinkQuiet(key); return fail(status, msg) }

  const name = fixName(file.originalname)
  const type = TYPES[extOf(name)]
  if (!type) return reject(415, 'Type de fichier non accepté')
  if (file.size === 0) return reject(400, 'Fichier vide')

  if (type.sniff) {
    const fd = fs.openSync(file.path, 'r')
    const head = Buffer.alloc(16)
    try { fs.readSync(fd, head, 0, 16, 0) } finally { fs.closeSync(fd) }
    if (!type.sniff(head)) return reject(400, 'Le contenu ne correspond pas au type du fichier')
  }
  // Re-contrôle du quota avec la vraie taille (deux envois simultanés ont pu passer le contrôle initial).
  if (await projectUsage(ctx.projectId) + file.size > env.projectQuotaBytes) return reject(413, 'Espace de stockage du projet plein')

  const t = await TaskModel.findById(ctx.taskId)
  if (!t) return reject(404, 'Tâche introuvable')
  await q(
    'INSERT INTO task_attachments (id,task_id,project_id,uploader_id,name,mime,size,storage_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, ctx.taskId, ctx.projectId, user.id, name, type.mime, file.size, key],
  )
  await recordTaskEvent(ctx.taskId, ctx.projectId, user.id, 'attachment_added', { attachmentId: id, name })
  const targets = [...new Set([t.assignee_id, t.created_by].filter(Boolean).filter((x) => x !== user.id))]
  for (const targetId of targets) await notify(targetId as string, 'task_attachment', `Fichier : ${t.title}`, `${user.name} a ajouté « ${name} ».`)
  await notifyProject(ctx.projectId, { type: 'project', projectId: ctx.projectId })
  return view({ id, task_id: ctx.taskId, project_id: ctx.projectId, uploader_id: user.id, uploader_name: user.name, name, mime: type.mime, size: file.size, created_at: new Date().toISOString() }, user.id, true)
}

/** Supprime le fichier sur disque si la requête a échoué après son écriture (erreur, rejet…). */
export function discardUploaded(req: Request) {
  if (req.file?.path) { try { fs.rmSync(req.file.path, { force: true }) } catch { /* ignore */ } }
}

/* ───────── Lecture / suppression ───────── */

interface AttRow {
  id: string; task_id: string; project_id: string; uploader_id: string | null; uploader_name?: string | null
  name: string; mime: string; size: number | string; created_at: string
}

function view(r: AttRow, viewerId: string, canManage: boolean) {
  const ext = extOf(r.name)
  return {
    id: r.id,
    taskId: r.task_id,
    name: r.name,
    ext,
    mime: r.mime.split(';')[0],
    size: Number(r.size),
    kind: r.mime.startsWith('image/') ? 'image' : r.mime === 'application/pdf' ? 'pdf' : 'file',
    previewable: !!TYPES[ext]?.inline,
    uploaderId: r.uploader_id,
    uploaderName: r.uploader_name || null,
    canDelete: canManage || r.uploader_id === viewerId,
    at: r.created_at,
  }
}

export async function listAttachments(taskId: string, userId: string) {
  const { t, m } = await loadForMember(taskId, userId)
  const rows = await many<AttRow>(
    `SELECT a.*, u.name AS uploader_name FROM task_attachments a LEFT JOIN users u ON u.id=a.uploader_id
     WHERE a.task_id=$1 ORDER BY a.created_at ASC`, [t.id])
  const manage = ProjectModel.canManageRole(m.role)
  return {
    attachments: rows.map((r) => view(r, userId, manage)),
    usedBytes: await projectUsage(t.project_id),
    quotaBytes: env.projectQuotaBytes,
    maxFileBytes: env.maxUploadBytes,
    accept: ALLOWED_EXTENSIONS,
  }
}

export async function removeAttachment(id: string, userId: string) {
  const a = await one<AttRow & { storage_key: string }>('SELECT * FROM task_attachments WHERE id=$1', [id])
  if (!a) fail(404, 'Fichier introuvable')
  const m = await ProjectModel.findMembership(a.project_id, userId)
  if (!m) fail(403, 'Non membre')
  if (a.uploader_id !== userId && !ProjectModel.canManageRole(m.role)) fail(403, 'Suppression réservée à l’auteur ou au chef du projet')
  assertProjectOpen(await ProjectModel.findById(a.project_id))
  await q('DELETE FROM task_attachments WHERE id=$1', [a.id])
  unlinkQuiet(a.storage_key)
  await recordTaskEvent(a.task_id, a.project_id, userId, 'attachment_deleted', { attachmentId: a.id, name: a.name })
  await notifyProject(a.project_id, { type: 'project', projectId: a.project_id })
}

/* ───────── Téléchargement par lien signé ─────────
   Les fichiers sont privés. L'app demande un lien (authentifiée, avec contrôle d'appartenance
   au projet) ; le lien vaut 5 minutes et s'ouvre tel quel dans un navigateur, un <img> ou un
   lecteur de PDF, sans en-tête Authorization. */

const LINK_TTL_SECONDS = 5 * 60
const linkSecret = () => env.JWT_SECRET + ':attachment-link'

export async function createLink(id: string, userId: string, download: boolean) {
  const a = await one<AttRow>('SELECT * FROM task_attachments WHERE id=$1', [id])
  if (!a) fail(404, 'Fichier introuvable')
  if (!await ProjectModel.findMembership(a.project_id, userId)) fail(403, 'Non membre')
  const token = jwt.sign({ att: a.id, dl: download ? 1 : 0 }, linkSecret(), { audience: 'attachment', expiresIn: LINK_TTL_SECONDS })
  return { url: `/files/${token}`, expiresIn: LINK_TTL_SECONDS }
}

export async function resolveLink(token: string) {
  let payload: { att?: string; dl?: number }
  try { payload = jwt.verify(token, linkSecret(), { audience: 'attachment' }) as typeof payload } catch { return fail(401, 'Lien expiré') }
  const a = await one<AttRow & { storage_key: string }>('SELECT * FROM task_attachments WHERE id=$1', [payload.att])
  if (!a) fail(404, 'Fichier introuvable')
  const abs = keyPath(a.storage_key)
  if (!fs.existsSync(abs)) fail(404, 'Fichier introuvable')
  const inline = !payload.dl && !!TYPES[extOf(a.name)]?.inline
  return { abs, name: a.name, mime: a.mime, inline }
}

/** En-tête Content-Disposition sûr pour les noms accentués (RFC 5987). */
export function disposition(name: string, inline: boolean) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}
