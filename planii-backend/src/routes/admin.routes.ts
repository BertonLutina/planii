import { Router } from 'express'
import * as AdminController from '../controllers/Admin.controller'

export function adminRoutes() {
  const r = Router()
  r.get('/admin/stats', ...AdminController.stats)
  r.get('/admin/users', ...AdminController.listUsers)
  r.delete('/admin/users/:id', ...AdminController.deleteUser)
  r.patch('/admin/users/:id/admin', ...AdminController.setUserAdmin)
  r.get('/admin/audit', ...AdminController.audit)
  r.get('/admin/mail', ...AdminController.listMail)
  r.get('/admin/mail/:uid', ...AdminController.readMail)
  r.post('/admin/mail/send', ...AdminController.sendMail)
  r.post('/admin/mail/:uid/reply', ...AdminController.replyMail)
  r.get('/admin/tasks', ...AdminController.listTasks)
  r.patch('/admin/tasks/:id/priority', ...AdminController.setTaskPriority)
  r.get('/admin/projects', ...AdminController.listProjects)
  r.delete('/admin/projects/:id', ...AdminController.deleteProject)
  return r
}
