import { Router } from 'express'
import * as HealthController from '../controllers/Health.controller'

export function healthRoutes() {
  const r = Router()
  r.get('/health', HealthController.check)
  return r
}
