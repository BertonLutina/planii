import { asyncHandler, auth } from '../middleware/auth'
import * as PollService from '../services/poll.service'
import * as ProjectView from '../views/Project.view'

export const create = [auth, asyncHandler(async (req, res) => {
  res.json({ pollId: await PollService.createPoll(req.params.id, req.user!.id, req.body) })
})]

export const vote = [auth, asyncHandler(async (req, res) => {
  await PollService.vote(req.params.id, req.user!.id, req.body.optionId)
  res.json({ ok: true })
})]

export const activity = [auth, asyncHandler(async (req, res) => {
  res.json(ProjectView.activityPaginated(
    await PollService.listActivity(req.params.id, req.user!.id, req.query as Record<string, unknown>),
  ))
})]
