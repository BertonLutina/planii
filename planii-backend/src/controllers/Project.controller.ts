import { asyncHandler, auth } from '../middleware/auth'
import * as ProjectService from '../services/project.service'
import * as ProjectView from '../views/Project.view'

export const create = [auth, asyncHandler(async (req, res) => {
  const { project, role } = await ProjectService.createProject(req.user!.id, req.body)
  res.json(ProjectView.created(project as Record<string, unknown>, role))
})]

export const list = [auth, asyncHandler(async (req, res) => {
  const result = await ProjectService.listProjects(req.user!.id, req.query as Record<string, unknown>)
  if (Array.isArray(result)) {
    res.json({ projects: result })
  } else {
    res.json(result)
  }
})]

export const reorder = [auth, asyncHandler(async (req, res) => {
  await ProjectService.reorderProjects(req.user!.id, Array.isArray(req.body.ids) ? req.body.ids : [])
  res.json({ ok: true })
})]

export const listTasks = [auth, asyncHandler(async (req, res) => {
  const result = await ProjectService.listProjectTasks(req.params.id, req.user!.id, req.query as Record<string, unknown>)
  res.json(ProjectView.paginatedTasks(result))
})]

export const get = [auth, asyncHandler(async (req, res) => {
  const { project, myRole } = await ProjectService.getProject(req.params.id, req.user!.id)
  res.json(ProjectView.detail(project, myRole))
})]

export const close = [auth, asyncHandler(async (req, res) => {
  await ProjectService.closeProject(req.params.id, req.user!.id)
  res.json({ ok: true })
})]

export const reopen = [auth, asyncHandler(async (req, res) => {
  await ProjectService.reopenProject(req.params.id, req.user!.id)
  res.json({ ok: true })
})]

export const update = [auth, asyncHandler(async (req, res) => {
  const project = await ProjectService.updateProject(req.params.id, req.user!.id, req.body)
  res.json(ProjectView.single(project!))
})]

export const remove = [auth, asyncHandler(async (req, res) => {
  const notified = await ProjectService.deleteProject(req.params.id, req.user!.id, req.user!.name)
  res.json({ ok: true, notified })
})]

export const createRole = [auth, asyncHandler(async (req, res) => {
  const role = await ProjectService.createRole(req.params.id, req.user!.id, req.body)
  res.json(ProjectView.roleCreated(role.id, role.name))
})]

export const deleteRole = [auth, asyncHandler(async (req, res) => {
  await ProjectService.deleteRole(req.params.id, req.user!.id, req.params.roleId)
  res.json({ ok: true })
})]

export const setMemberRoles = [auth, asyncHandler(async (req, res) => {
  const ids = await ProjectService.setMemberRoles(req.params.id, req.user!.id, req.params.userId, req.body.roleIds)
  res.json(ProjectView.memberRoles(ids))
})]

export const createTaskStatus = [auth, asyncHandler(async (req, res) => {
  const statuses = await ProjectService.createTaskStatus(req.params.id, req.user!.id, req.body)
  res.json(ProjectView.statuses(statuses))
})]

export const deleteTaskStatus = [auth, asyncHandler(async (req, res) => {
  const statuses = await ProjectService.deleteTaskStatus(req.params.id, req.user!.id, req.params.key)
  res.json(ProjectView.statuses(statuses))
})]
