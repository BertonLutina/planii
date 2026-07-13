import { Router } from 'express'
import * as NotificationController from '../controllers/Notification.controller'

export function notificationsRoutes() {
  const r = Router()
  r.get('/notifications', ...NotificationController.list)
  r.post('/notifications/read', ...NotificationController.markRead)
  r.delete('/notifications/:id', ...NotificationController.remove)
  return r
}
