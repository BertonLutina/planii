import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { env } from '../config/env'
import { fail } from '../core/http-error'
import { q } from '../db/pool'
import * as UserModel from '../models/User.model'
import * as ProjectModel from '../models/Project.model'

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const uploadDir = env.UPLOAD_DIR

export function ensureUploadDirs() {
  for (const sub of ['avatars', 'projects'] as const) {
    fs.mkdirSync(path.join(uploadDir, sub), { recursive: true })
  }
}

ensureUploadDirs()

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!EXT[file.mimetype]) return cb(new Error('Format invalide (JPEG, PNG ou WebP)'))
    cb(null, true)
  },
})

/** Map stored URL `/uploads/avatars/id.jpg` → absolute file under UPLOAD_DIR. */
export function absoluteFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const cleaned = String(url).replace(/^\/+/, '')
  if (!cleaned.startsWith('uploads/')) return null
  const rel = cleaned.slice('uploads/'.length) // avatars/id.jpg
  const abs = path.resolve(uploadDir, rel)
  const root = path.resolve(uploadDir)
  if (!abs.startsWith(root + path.sep) && abs !== root) return null
  return abs
}

function publicUrl(kind: 'avatars' | 'projects', id: string, ext: string) {
  return `/uploads/${kind}/${id}.${ext}`
}

function unlinkQuiet(filePath: string | null) {
  if (!filePath) return
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch { /* ignore */ }
}

function wipeKindFiles(kind: 'avatars' | 'projects', id: string, previousUrl?: string | null) {
  unlinkQuiet(absoluteFromUrl(previousUrl || null))
  for (const oldExt of Object.values(EXT)) {
    unlinkQuiet(path.join(uploadDir, kind, `${id}.${oldExt}`))
  }
}

/** Delete previous image(s) for this id, then write the new file. */
function replaceImage(kind: 'avatars' | 'projects', id: string, file: Express.Multer.File, previousUrl: string | null | undefined) {
  const ext = EXT[file.mimetype]
  if (!ext) fail(400, 'Format invalide (JPEG, PNG ou WebP)')
  const dir = path.join(uploadDir, kind)
  fs.mkdirSync(dir, { recursive: true })
  wipeKindFiles(kind, id, previousUrl)
  const dest = path.join(dir, `${id}.${ext}`)
  fs.writeFileSync(dest, file.buffer)
  return publicUrl(kind, id, ext)
}

export async function setUserAvatar(userId: string, file: Express.Multer.File | undefined) {
  if (!file) fail(400, 'Fichier requis')
  const user = await UserModel.findById(userId)
  if (!user) fail(404, 'Utilisateur introuvable')
  const url = replaceImage('avatars', userId, file, (user as { avatar_url?: string | null }).avatar_url)
  await q('UPDATE users SET avatar_url=$1 WHERE id=$2', [url, userId])
  return url
}

export async function clearUserAvatar(userId: string) {
  const user = await UserModel.findById(userId)
  if (!user) fail(404, 'Utilisateur introuvable')
  wipeKindFiles('avatars', userId, (user as { avatar_url?: string | null }).avatar_url)
  await q('UPDATE users SET avatar_url=NULL WHERE id=$1', [userId])
}

export async function setProjectImage(projectId: string, userId: string, file: Express.Multer.File | undefined) {
  if (!file) fail(400, 'Fichier requis')
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  if (p.owner_id !== userId) fail(403, 'Seul le propriétaire peut modifier l’image')
  if (ProjectModel.isClosed(p)) fail(403, 'Projet clôturé')
  const url = replaceImage('projects', projectId, file, (p as { image_url?: string | null }).image_url)
  await q('UPDATE projects SET image_url=$1 WHERE id=$2', [url, projectId])
  return url
}

export async function clearProjectImage(projectId: string, userId: string) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  if (p.owner_id !== userId) fail(403, 'Seul le propriétaire peut modifier l’image')
  wipeKindFiles('projects', projectId, (p as { image_url?: string | null }).image_url)
  await q('UPDATE projects SET image_url=NULL WHERE id=$1', [projectId])
}

export function deleteProjectImageFiles(projectId: string, imageUrl?: string | null) {
  wipeKindFiles('projects', projectId, imageUrl)
}
