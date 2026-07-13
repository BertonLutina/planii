import { Router } from 'express'
import * as InviteController from '../controllers/Invite.controller'

export function invitesRoutes() {
  const r = Router()
  r.post('/projects/:id/invites', ...InviteController.create)
  r.get('/invites/:token', InviteController.get)
  r.post('/invites/:token/accept', ...InviteController.accept)
  return r
}
