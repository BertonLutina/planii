import { asyncHandler, auth } from '../middleware/auth'
import * as MeetingService from '../services/meeting.service'
import * as TaskView from '../views/Task.view'

export const listMessages = [auth, asyncHandler(async (req, res) => {
  res.json({ messages: await MeetingService.listMessages(req.params.id, req.user!.id) })
})]

export const postMessage = [auth, asyncHandler(async (req, res) => {
  res.json({ message: await MeetingService.postMessage(req.params.id, req.user!, req.body.body) })
})]

export const listTaskDelegates = [auth, asyncHandler(async (req, res) => {
  res.json({ userIds: await MeetingService.listTaskDelegates(req.params.id, req.user!.id) })
})]

export const setTaskDelegates = [auth, asyncHandler(async (req, res) => {
  res.json({ userIds: await MeetingService.setTaskDelegates(req.params.id, req.user!.id, req.body.userIds) })
})]

export const createTask = [auth, asyncHandler(async (req, res) => {
  res.json(TaskView.meetingCreated(await MeetingService.createMeetingTask(req.params.id, req.user!, req.body)))
})]
