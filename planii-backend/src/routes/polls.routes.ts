import { Router } from 'express'
import * as PollController from '../controllers/Poll.controller'

export function pollsRoutes() {
  const r = Router()
  r.post('/projects/:id/polls', ...PollController.create)
  r.post('/polls/:id/vote', ...PollController.vote)
  r.get('/projects/:id/activity', ...PollController.activity)
  return r
}
