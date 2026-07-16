import { Router } from 'express'
import * as MeetingController from '../controllers/Meeting.controller'
import { validate } from '../middleware/validate'
import { meetingMessageSchema, meetingDelegatesSchema, meetingTaskSchema } from '../schemas'

export function meetingRoutes() {
  const r = Router()
  r.get('/projects/:id/meeting/messages', ...MeetingController.listMessages)
  r.post('/projects/:id/meeting/messages', validate(meetingMessageSchema), ...MeetingController.postMessage)
  r.get('/projects/:id/meeting/task-delegates', ...MeetingController.listTaskDelegates)
  r.put('/projects/:id/meeting/task-delegates', validate(meetingDelegatesSchema), ...MeetingController.setTaskDelegates)
  r.post('/projects/:id/meeting/tasks', validate(meetingTaskSchema), ...MeetingController.createTask)
  return r
}
