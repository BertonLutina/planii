import { asyncHandler, auth } from '../middleware/auth'
import * as TaskService from '../services/task.service'
import * as TaskView from '../views/Task.view'

export const listMine = [auth, asyncHandler(async (req, res) => {
  res.json(TaskView.mine(await TaskService.listMyTasks(req.user!.id)))
})]

export const reorder = [auth, asyncHandler(async (req, res) => {
  await TaskService.reorderTasks(req.params.id, req.user!.id, Array.isArray(req.body.ids) ? req.body.ids : [])
  res.json({ ok: true })
})]

export const create = [auth, asyncHandler(async (req, res) => {
  const task = await TaskService.createTask(req.params.id, req.user!, req.body)
  res.json(TaskView.created(task))
})]

export const update = [auth, asyncHandler(async (req, res) => {
  await TaskService.updateTask(req.params.id, req.user!, req.body)
  res.json({ ok: true })
})]

export const claim = [auth, asyncHandler(async (req, res) => {
  await TaskService.claimTask(req.params.id, req.user!.id)
  res.json({ ok: true })
})]

export const remind = [auth, asyncHandler(async (req, res) => {
  await TaskService.remindTask(req.params.id, req.user!)
  res.json({ ok: true })
})]

export const remove = [auth, asyncHandler(async (req, res) => {
  await TaskService.deleteTask(req.params.id, req.user!.id)
  res.json({ ok: true })
})]

export const listComments = [auth, asyncHandler(async (req, res) => {
  res.json(TaskView.comments(await TaskService.listComments(req.params.id, req.user!.id)))
})]

export const addComment = [auth, asyncHandler(async (req, res) => {
  res.json(TaskView.commentCreated(await TaskService.addComment(req.params.id, req.user!, req.body.body)))
})]

export const deleteComment = [auth, asyncHandler(async (req, res) => {
  await TaskService.deleteComment(req.params.id, req.user!.id)
  res.json({ ok: true })
})]

export const listEvents = [auth, asyncHandler(async (req, res) => {
  res.json(TaskView.events(await TaskService.listEvents(req.params.id, req.user!.id)))
})]
