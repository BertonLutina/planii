import { Router } from 'express'
import * as InviteController from '../controllers/Invite.controller'
import { validate } from '../middleware/validate'
import { inviteCreateSchema } from '../schemas'

export function invitesRoutes() {
  const r = Router()
  r.post('/projects/:id/invites', validate(inviteCreateSchema), ...InviteController.create)
  r.get('/invites/:token', InviteController.get)
  r.post('/invites/:token/accept', ...InviteController.accept)
  return r
}
