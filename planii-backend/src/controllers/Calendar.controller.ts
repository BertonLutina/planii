import { asyncHandler, auth } from '../middleware/auth'
import * as CalendarService from '../services/calendar.service'
import * as CalendarView from '../views/Calendar.view'

export const list = [auth, asyncHandler(async (req, res) => {
  const from = String(req.query.from || '')
  const to = String(req.query.to || '')
  res.json(CalendarView.events(await CalendarService.listCalendarEvents(req.user!.id, from, to)))
})]
