import { Router } from 'express'
import * as MeetingController from '../controllers/Meeting.controller'

export function meetingRoutes() {
  const r = Router()
  r.get('/projects/:id/meeting/messages', ...MeetingController.listMessages)
  r.post('/projects/:id/meeting/messages', ...MeetingController.postMessage)
  r.get('/projects/:id/meeting/task-delegates', ...MeetingController.listTaskDelegates)
  r.put('/projects/:id/meeting/task-delegates', ...MeetingController.setTaskDelegates)
  r.post('/projects/:id/meeting/tasks', ...MeetingController.createTask)
  return r
}
