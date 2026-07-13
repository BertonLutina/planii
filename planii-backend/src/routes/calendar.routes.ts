import { Router } from 'express'
import * as CalendarController from '../controllers/Calendar.controller'

export function calendarRoutes() {
  const r = Router()
  r.get('/calendar', ...CalendarController.list)
  return r
}
