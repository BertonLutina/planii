import fs from 'fs'
import path from 'path'
import { beforeEach, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../src/app'
import { q, one } from '../src/db/pool'
import { env } from '../src/config/env'
import { uid } from '../src/lib/utils'
import * as UserView from '../src/views/User.view'
import { dbAvailable, resetDb } from './setup'

const app = createApp()

/** Un « PDF » minimal : l'en-tête compte (le serveur vérifie les premiers octets), pas le reste. */
const pdf = (bytes = 200) => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(bytes, 0x20)])
const zip = (bytes = 200) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(bytes)])

describe('task attachments', () => {
  let ownerToken = ''
  let memberToken = ''
  let otherToken = ''
  let outsiderToken = ''
  let taskId = ''
  let projectId = ''

  beforeEach(async () => {
    if (!dbAvailable) return
    await resetDb()
    fs.rmSync(env.attachmentsDir, { recursive: true, force: true })

    const [ownerId, memberId, otherId, outsiderId] = [uid(), uid(), uid(), uid()]
    projectId = uid()
    taskId = uid()
    const pass = bcrypt.hashSync('secret123', 10)
    await q('INSERT INTO users (id,name,email,pass_hash) VALUES ($1,$2,$3,$4),($5,$6,$7,$8),($9,$10,$11,$12),($13,$14,$15,$16)', [
      ownerId, 'Owner', 'owner@planii.app', pass,
      memberId, 'Member', 'member@planii.app', pass,
      otherId, 'Other', 'other@planii.app', pass,
      outsiderId, 'Outsider', 'outsider@planii.app', pass,
    ])
    await q('INSERT INTO projects (id,name,type,owner_id) VALUES ($1,$2,$3,$4)', [projectId, 'Projet', 'team', ownerId])
    await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4),($5,$2,$6,$7),($8,$2,$9,$10)', [
      uid(), projectId, ownerId, 'owner',
      uid(), memberId, 'client',
      uid(), otherId, 'client',
    ])
    await q(`INSERT INTO tasks (id,project_id,title,assignee_id,created_by,status_key) VALUES ($1,$2,'Tâche',$3,$4,'todo')`, [taskId, projectId, memberId, ownerId])
    const tok = (id: string, name: string, email: string) => UserView.signToken({ id, name, email, pass_hash: pass } as never)
    ownerToken = tok(ownerId, 'Owner', 'owner@planii.app')
    memberToken = tok(memberId, 'Member', 'member@planii.app')
    otherToken = tok(otherId, 'Other', 'other@planii.app')
    outsiderToken = tok(outsiderId, 'Outsider', 'outsider@planii.app')
  })

  afterAll(() => { fs.rmSync(env.attachmentsDir, { recursive: true, force: true }) })

  const upload = (token: string, buf: Buffer, filename: string) =>
    request(app).post(`/api/tasks/${taskId}/attachments`).set('Authorization', 'Bearer ' + token).attach('file', buf, { filename })

  it('un membre ajoute un PDF et il apparaît dans la liste et le compteur', async () => {
    if (!dbAvailable) return
    const res = await upload(memberToken, pdf(), 'Devis mars.pdf')
    expect(res.status).toBe(201)
    expect(res.body.attachment).toMatchObject({ name: 'Devis mars.pdf', ext: 'pdf', kind: 'pdf', previewable: true, canDelete: true })

    const list = await request(app).get(`/api/tasks/${taskId}/attachments`).set('Authorization', 'Bearer ' + otherToken)
    expect(list.status).toBe(200)
    expect(list.body.attachments).toHaveLength(1)
    expect(list.body.attachments[0].canDelete).toBe(false) // un autre membre ne peut pas supprimer
    expect(list.body.usedBytes).toBeGreaterThan(0)

    const proj = await request(app).get(`/api/projects/${projectId}`).set('Authorization', 'Bearer ' + memberToken)
    const t = (proj.body.project?.tasks || proj.body.tasks || []).find((x: { id: string }) => x.id === taskId)
    if (t) expect(t.attachmentCount).toBe(1)
  })

  it('garde les accents du nom de fichier', async () => {
    if (!dbAvailable) return
    const res = await upload(memberToken, zip(), 'Résumé budget été.docx')
    expect(res.status).toBe(201)
    expect(res.body.attachment.name).toBe('Résumé budget été.docx')
    expect(res.body.attachment.previewable).toBe(false)
  })

  it('refuse un non-membre partout (liste, ajout, lien)', async () => {
    if (!dbAvailable) return
    expect((await request(app).get(`/api/tasks/${taskId}/attachments`).set('Authorization', 'Bearer ' + outsiderToken)).status).toBe(403)
    expect((await upload(outsiderToken, pdf(), 'x.pdf')).status).toBe(403)
    const ok = await upload(memberToken, pdf(), 'a.pdf')
    const link = await request(app).get(`/api/attachments/${ok.body.attachment.id}/link`).set('Authorization', 'Bearer ' + outsiderToken)
    expect(link.status).toBe(403)
    expect((await request(app).get(`/api/tasks/${taskId}/attachments`)).status).toBe(401)
  })

  it('refuse les types dangereux ou inconnus', async () => {
    if (!dbAvailable) return
    for (const name of ['virus.exe', 'page.html', 'image.svg', 'script.js', 'sans-extension']) {
      const res = await upload(memberToken, Buffer.from('<script>alert(1)</script>'), name)
      expect(res.status, name).toBe(415)
    }
    expect((await one('SELECT count(*)::int AS n FROM task_attachments'))?.n).toBe(0)
  })

  it('refuse un fichier dont le contenu ne correspond pas à l’extension', async () => {
    if (!dbAvailable) return
    const res = await upload(memberToken, Buffer.from('ceci est du texte, pas un PNG'), 'photo.png')
    expect(res.status).toBe(400)
    expect(fs.existsSync(path.join(env.attachmentsDir, projectId)) ? fs.readdirSync(path.join(env.attachmentsDir, projectId)) : []).toEqual([])
  })

  it('refuse un fichier trop lourd sans laisser de reste sur le disque', async () => {
    if (!dbAvailable) return
    const res = await upload(memberToken, pdf(env.maxUploadBytes + 10), 'gros.pdf')
    expect(res.status).toBe(413)
    expect(res.body.error).toMatch(/trop lourd/i)
    const dir = path.join(env.attachmentsDir, projectId)
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toEqual([])
  })

  it('applique le quota du projet', async () => {
    if (!dbAvailable) return
    const chunk = Math.floor(env.maxUploadBytes * 0.9)
    expect((await upload(memberToken, pdf(chunk), 'a.pdf')).status).toBe(201)
    expect((await upload(memberToken, pdf(chunk), 'b.pdf')).status).toBe(201)
    const third = await upload(memberToken, pdf(chunk), 'c.pdf')
    expect(third.status).toBe(413)
    expect(third.body.error).toMatch(/stockage/i)
  })

  it('télécharge par lien signé : PDF affiché, Word téléchargé, jeton invalide refusé', async () => {
    if (!dbAvailable) return
    const a = (await upload(memberToken, pdf(), 'Devis.pdf')).body.attachment
    const d = (await upload(memberToken, zip(), 'Contrat.docx')).body.attachment

    const lp = await request(app).get(`/api/attachments/${a.id}/link`).set('Authorization', 'Bearer ' + otherToken)
    expect(lp.status).toBe(200)
    const file = await request(app).get('/api/' + lp.body.url.replace(/^\//, ''))
    expect(file.status).toBe(200)
    expect(file.headers['content-type']).toMatch(/application\/pdf/)
    expect(file.headers['content-disposition']).toMatch(/^inline/)
    expect(file.headers['x-content-type-options']).toBe('nosniff')

    const forced = await request(app).get(`/api/attachments/${a.id}/link?download=1`).set('Authorization', 'Bearer ' + otherToken)
    expect((await request(app).get('/api/' + forced.body.url.replace(/^\//, ''))).headers['content-disposition']).toMatch(/^attachment/)

    const ld = await request(app).get(`/api/attachments/${d.id}/link`).set('Authorization', 'Bearer ' + otherToken)
    const docx = await request(app).get('/api/' + ld.body.url.replace(/^\//, ''))
    expect(docx.headers['content-disposition']).toMatch(/^attachment/)

    expect((await request(app).get('/api/files/pas-un-jeton')).status).toBe(401)
    // Un jeton de session ne doit pas ouvrir un fichier.
    expect((await request(app).get('/api/files/' + ownerToken)).status).toBe(401)
  })

  it('les fichiers ne sont jamais servis par le dossier public /uploads', async () => {
    if (!dbAvailable) return
    const a = (await upload(memberToken, pdf(), 'secret.pdf')).body.attachment
    const row = await one<{ storage_key: string }>('SELECT storage_key FROM task_attachments WHERE id=$1', [a.id])
    for (const url of [`/api/uploads/private/attachments/${row!.storage_key}`, `/api/uploads/${row!.storage_key}`, '/api/uploads/private']) {
      const res = await request(app).get(url)
      expect(res.status, url).toBeGreaterThanOrEqual(400)
      expect(res.headers['content-type'] || '').not.toMatch(/pdf/)
    }
  })

  it('suppression : l’auteur et le propriétaire oui, un autre membre non ; le fichier disparaît du disque', async () => {
    if (!dbAvailable) return
    const a = (await upload(memberToken, pdf(), 'a.pdf')).body.attachment
    const row = await one<{ storage_key: string }>('SELECT storage_key FROM task_attachments WHERE id=$1', [a.id])
    const abs = path.join(env.attachmentsDir, row!.storage_key)
    expect(fs.existsSync(abs)).toBe(true)

    expect((await request(app).delete(`/api/attachments/${a.id}`).set('Authorization', 'Bearer ' + otherToken)).status).toBe(403)
    expect((await request(app).delete(`/api/attachments/${a.id}`).set('Authorization', 'Bearer ' + ownerToken)).status).toBe(200)
    expect(fs.existsSync(abs)).toBe(false)
    expect((await one('SELECT 1 FROM task_attachments WHERE id=$1', [a.id]))).toBeNull()
  })

  it('supprimer la tâche supprime ses fichiers', async () => {
    if (!dbAvailable) return
    const a = (await upload(memberToken, pdf(), 'a.pdf')).body.attachment
    const row = await one<{ storage_key: string }>('SELECT storage_key FROM task_attachments WHERE id=$1', [a.id])
    const abs = path.join(env.attachmentsDir, row!.storage_key)
    expect((await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', 'Bearer ' + ownerToken)).status).toBe(200)
    expect(fs.existsSync(abs)).toBe(false)
    expect((await one('SELECT count(*)::int AS n FROM task_attachments'))?.n).toBe(0)
  })

  it('projet clôturé : lecture possible, ajout refusé', async () => {
    if (!dbAvailable) return
    await upload(memberToken, pdf(), 'a.pdf')
    await q(`UPDATE projects SET status='done' WHERE id=$1`, [projectId])
    expect((await request(app).get(`/api/tasks/${taskId}/attachments`).set('Authorization', 'Bearer ' + memberToken)).status).toBe(200)
    expect((await upload(memberToken, pdf(), 'b.pdf')).status).toBe(423) // même code que les commentaires sur projet clos
  })
})
