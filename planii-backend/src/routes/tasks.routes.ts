import { Router } from 'express'
import * as TaskController from '../controllers/Task.controller'
import { validate } from '../middleware/validate'
import { idsSchema, taskCreateSchema, taskUpdateSchema, commentSchema } from '../schemas'

export function tasksRoutes() {
  const r = Router()
  r.get('/tasks/mine', ...TaskController.listMine)
  r.put('/projects/:id/tasks/order', validate(idsSchema), ...TaskController.reorder)
  r.post('/projects/:id/tasks', validate(taskCreateSchema), ...TaskController.create)
  r.patch('/tasks/:id', validate(taskUpdateSchema), ...TaskController.update)
  r.post('/tasks/:id/claim', ...TaskController.claim)
  r.post('/tasks/:id/remind', ...TaskController.remind)
  r.delete('/tasks/:id', ...TaskController.remove)
  r.get('/tasks/:id/comments', ...TaskController.listComments)
  r.post('/tasks/:id/comments', validate(commentSchema), ...TaskController.addComment)
  r.delete('/task-comments/:id', ...TaskController.deleteComment)
  r.get('/tasks/:id/events', ...TaskController.listEvents)
  return r
}
