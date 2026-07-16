import { Router } from 'express'
import * as ProjectController from '../controllers/Project.controller'
import { validate } from '../middleware/validate'
import { projectCreateSchema, projectUpdateSchema, idsSchema, roleNameSchema, memberRolesSchema, taskStatusSchema } from '../schemas'

export function projectsRoutes() {
  const r = Router()
  r.post('/projects', validate(projectCreateSchema), ...ProjectController.create)
  r.get('/projects', ...ProjectController.list)
  r.put('/projects/order', validate(idsSchema), ...ProjectController.reorder)
  r.get('/projects/:id/tasks', ...ProjectController.listTasks)
  r.get('/projects/:id', ...ProjectController.get)
  r.post('/projects/:id/close', ...ProjectController.close)
  r.post('/projects/:id/reopen', ...ProjectController.reopen)
  r.patch('/projects/:id', validate(projectUpdateSchema), ...ProjectController.update)
  r.delete('/projects/:id', ...ProjectController.remove)
  r.post('/projects/:id/roles', validate(roleNameSchema), ...ProjectController.createRole)
  r.delete('/projects/:id/roles/:roleId', ...ProjectController.deleteRole)
  r.put('/projects/:id/members/:userId/roles', validate(memberRolesSchema), ...ProjectController.setMemberRoles)
  r.post('/projects/:id/task-statuses', validate(taskStatusSchema), ...ProjectController.createTaskStatus)
  r.delete('/projects/:id/task-statuses/:key', ...ProjectController.deleteTaskStatus)
  return r
}
