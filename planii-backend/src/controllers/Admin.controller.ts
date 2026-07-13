import { asyncHandler, auth, adminOnly, superAdminOnly } from '../middleware/auth'
import * as AdminService from '../services/admin.service'
import * as AdminView from '../views/Admin.view'

export const stats = [auth, adminOnly, asyncHandler(async (_req, res) => {
  res.json(AdminView.stats(await AdminService.getStats()))
})]

export const listUsers = [auth, adminOnly, asyncHandler(async (req, res) => {
  res.json(AdminView.paginated(await AdminService.listUsers(req.query as Record<string, unknown>)))
})]

export const deleteUser = [auth, adminOnly, asyncHandler(async (req, res) => {
  const deletedProjects = await AdminService.deleteUser(req.user!, req.params.id)
  res.json({ ok: true, deletedProjects })
})]

export const setUserAdmin = [auth, superAdminOnly, asyncHandler(async (req, res) => {
  const admin = await AdminService.setUserAdmin(req.user!, req.params.id, !!req.body.admin)
  res.json({ ok: true, admin })
})]

export const audit = [auth, superAdminOnly, asyncHandler(async (req, res) => {
  const result = await AdminService.listAudit(req.query as Record<string, unknown>)
  res.json({
    ...AdminView.paginated(result),
    audit: result.items.map((row: Record<string, unknown>) => ({
      id: row.id,
      actor: row.actor_name,
      action: row.action,
      detail: row.detail,
      at: row.created_at,
    })),
  })
})]

export const listMail = [auth, superAdminOnly, asyncHandler(async (_req, res) => {
  const data = await AdminService.listMail()
  res.json(AdminView.mailList(data!.messages, data!.mailbox))
})]

export const readMail = [auth, superAdminOnly, asyncHandler(async (req, res) => {
  res.json(AdminView.mailMessage(await AdminService.readMail(req.params.uid)))
})]

export const sendMail = [auth, superAdminOnly, asyncHandler(async (req, res) => {
  await AdminService.sendMail(req.user!, req.body)
  res.json({ ok: true })
})]

export const replyMail = [auth, superAdminOnly, asyncHandler(async (req, res) => {
  await AdminService.replyMail(req.user!, req.params.uid, req.body.body)
  res.json({ ok: true })
})]

export const listTasks = [auth, adminOnly, asyncHandler(async (req, res) => {
  res.json(AdminView.paginated(await AdminService.listTasks(req.query as Record<string, unknown>)))
})]

export const setTaskPriority = [auth, adminOnly, asyncHandler(async (req, res) => {
  const priority = await AdminService.setTaskPriority(req.user!, req.params.id, req.body.priority)
  res.json({ ok: true, priority })
})]

export const listProjects = [auth, adminOnly, asyncHandler(async (req, res) => {
  res.json(AdminView.paginated(await AdminService.listProjects(req.query as Record<string, unknown>)))
})]

export const deleteProject = [auth, adminOnly, asyncHandler(async (req, res) => {
  await AdminService.deleteProject(req.user!, req.params.id)
  res.json({ ok: true })
})]
