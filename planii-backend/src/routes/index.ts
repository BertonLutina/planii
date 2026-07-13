import { Router } from 'express'
import { authRoutes } from './auth.routes'
import { meRoutes } from './me.routes'
import { projectsRoutes } from './projects.routes'
import { tasksRoutes } from './tasks.routes'
import { invitesRoutes } from './invites.routes'
import { meetingRoutes } from './meeting.routes'
import { pollsRoutes } from './polls.routes'
import { notificationsRoutes } from './notifications.routes'
import { todayRoutes } from './today.routes'
import { calendarRoutes } from './calendar.routes'
import { adminRoutes } from './admin.routes'
import { healthRoutes } from './health.routes'

export function apiRoutes() {
  const r = Router()
  r.use('/auth', authRoutes())
  r.use(meRoutes())
  r.use(projectsRoutes())
  r.use(tasksRoutes())
  r.use(invitesRoutes())
  r.use(meetingRoutes())
  r.use(pollsRoutes())
  r.use(notificationsRoutes())
  r.use(todayRoutes())
  r.use(calendarRoutes())
  r.use(adminRoutes())
  r.use(healthRoutes())
  return r
}
