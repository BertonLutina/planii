import { Router } from 'express'
import * as TodayController from '../controllers/Today.controller'

export function todayRoutes() {
  const r = Router()
  r.get('/today', ...TodayController.get)
  return r
}
