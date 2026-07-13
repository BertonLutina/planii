import { asyncHandler, auth } from '../middleware/auth'
import * as NotificationService from '../services/notification.service'

export const list = [auth, asyncHandler(async (req, res) => {
  res.json(await NotificationService.listForUser(req.user!.id))
})]

export const markRead = [auth, asyncHandler(async (req, res) => {
  await NotificationService.markRead(req.user!.id, req.body.ids)
  res.json({ ok: true })
})]

export const remove = [auth, asyncHandler(async (req, res) => {
  await NotificationService.removeNotification(req.user!.id, req.params.id)
  res.json({ ok: true })
})]
