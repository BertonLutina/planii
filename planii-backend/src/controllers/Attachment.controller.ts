import type { NextFunction, Request, Response } from 'express'
import { asyncHandler, auth } from '../middleware/auth'
import * as AttachmentService from '../services/attachment.service'

export const list = [auth, asyncHandler(async (req, res) => {
  res.json(await AttachmentService.listAttachments(req.params.id, req.user!.id))
})]

/** Ordre voulu : authentification → contrôles (membre, projet ouvert, quota) → réception du fichier → enregistrement. */
export const create = [
  auth,
  asyncHandler(async (req, _res, next) => { await AttachmentService.precheck(req); next() }),
  (req: Request, res: Response, next: NextFunction) => {
    AttachmentService.uploadSingle(req, res, (err) => {
      if (err) { AttachmentService.discardUploaded(req); return next(err) }
      next()
    })
  },
  asyncHandler(async (req, res) => {
    try {
      res.status(201).json({ attachment: await AttachmentService.saveUploaded(req, req.user!) })
    } catch (e) {
      AttachmentService.discardUploaded(req)
      throw e
    }
  }),
]

export const remove = [auth, asyncHandler(async (req, res) => {
  await AttachmentService.removeAttachment(req.params.id, req.user!.id)
  res.json({ ok: true })
})]

export const link = [auth, asyncHandler(async (req, res) => {
  res.json(await AttachmentService.createLink(req.params.id, req.user!.id, req.query.download === '1'))
})]

/** Public (le jeton signé fait office d'autorisation) : sert les octets. */
export const download = asyncHandler(async (req, res) => {
  const f = await AttachmentService.resolveLink(req.params.token)
  res.setHeader('Content-Type', f.mime)
  res.setHeader('Content-Disposition', AttachmentService.disposition(f.name, f.inline))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.sendFile(f.abs, { dotfiles: 'allow' }, (err) => { if (err && !res.headersSent) res.status(404).json({ error: 'Fichier introuvable' }) })
})
