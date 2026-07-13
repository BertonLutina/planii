import { Router } from 'express'
import * as TaskController from '../controllers/Task.controller'

export function tasksRoutes() {
  const r = Router()
  r.get('/tasks/mine', ...TaskController.listMine)
  r.put('/projects/:id/tasks/order', ...TaskController.reorder)
  r.post('/projects/:id/tasks', ...TaskController.create)
  r.patch('/tasks/:id', ...TaskController.update)
  r.post('/tasks/:id/claim', ...TaskController.claim)
  r.post('/tasks/:id/remind', ...TaskController.remind)
  r.delete('/tasks/:id', ...TaskController.remove)
  r.get('/tasks/:id/comments', ...TaskController.listComments)
  r.post('/tasks/:id/comments', ...TaskController.addComment)
  r.delete('/task-comments/:id', ...TaskController.deleteComment)
  r.get('/tasks/:id/events', ...TaskController.listEvents)
  return r
}
