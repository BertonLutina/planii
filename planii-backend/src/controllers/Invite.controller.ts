import { asyncHandler, auth } from '../middleware/auth'
import * as InviteService from '../services/invite.service'

export const create = [auth, asyncHandler(async (req, res) => {
  res.json(await InviteService.createInvite(req.params.id, req.user!, req.body))
})]

export const get = asyncHandler(async (req, res) => {
  res.json(await InviteService.getInvite(req.params.token))
})

export const accept = [auth, asyncHandler(async (req, res) => {
  const result = await InviteService.acceptInvite(req.params.token, req.user!)
  if (result.already) return res.json({ project: result.project, already: true })
  res.json({ project: result.project, role: result.role })
})]
