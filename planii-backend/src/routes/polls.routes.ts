import { Router } from 'express'
import * as PollController from '../controllers/Poll.controller'
import { validate } from '../middleware/validate'
import { pollCreateSchema, pollVoteSchema } from '../schemas'

export function pollsRoutes() {
  const r = Router()
  r.post('/projects/:id/polls', validate(pollCreateSchema), ...PollController.create)
  r.post('/polls/:id/vote', validate(pollVoteSchema), ...PollController.vote)
  r.get('/projects/:id/activity', ...PollController.activity)
  return r
}
