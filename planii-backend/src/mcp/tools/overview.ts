import { z } from 'zod'
import { tool } from '../tooling'
import * as TodayService from '../../services/today.service'
import * as CalendarService from '../../services/calendar.service'
import * as AppointmentService from '../../services/appointment.service'
import { todayCard, appointmentOut } from '../views'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format AAAA-MM-JJ')

export const overviewTools = [
  tool({
    name: 'planii_get_me',
    title: 'Mon profil Planii',
    description: 'Renvoie l’utilisateur connecté (id, nom, métier, langue). À appeler pour connaître mon id quand il faut m’assigner une tâche ou m’inviter à un rendez-vous.',
    scope: 'planii:read',
    input: {},
    handler: async (_a, p) => {
      const u = p.user
      return { me: { id: u.id, name: u.name, job: u.job ?? null, lang: u.lang ?? null }, grantedScopes: p.scopes }
    },
  }),
  tool({
    name: 'planii_get_today',
    title: 'Ma journée',
    description: 'Tableau de bord du jour : mes tâches à rendre aujourd’hui, mes tâches en retard, mes tâches très prioritaires, celles en relecture et les discussions actives. Idéal pour « Que dois-je terminer aujourd’hui ? » ou « Qu’est-ce qui est en retard ? ».',
    scope: 'planii:read',
    input: {},
    handler: async (_a, p) => {
      const t = (await TodayService.getToday(p.user.id)) as Record<string, any[]>
      return {
        dueToday: t.dueToday.map(todayCard),
        overdue: t.overdue.map(todayCard),
        highPriority: t.highPriority.map(todayCard),
        inReview: t.review.map(todayCard),
        activeDiscussions: t.activeDiscussions,
      }
    },
  }),
  tool({
    name: 'planii_get_schedule',
    title: 'Planning sur une période',
    description: 'Planning de l’utilisateur entre deux dates (AAAA-MM-JJ, 62 jours max) : échéances de tâches, livraisons de projets et rendez-vous, tous projets confondus. Idéal pour « Organise mon planning de la semaine ».',
    scope: 'planii:read',
    input: { from: date, to: date, projectId: z.string().max(64).optional().describe('Limiter les rendez-vous à un projet') },
    summarize: (a) => `${a.from} → ${a.to}`,
    handler: async (a, p) => {
      const from = String(a.from), to = String(a.to)
      const span = (new Date(to).getTime() - new Date(from).getTime()) / 864e5
      if (span > 62) return { error: 'Période trop longue (62 jours max).' }
      const events = await CalendarService.listCalendarEvents(p.user.id, from, to)
      const appts = await AppointmentService.listMyAppointments(p.user.id, from, to, a.projectId ? String(a.projectId) : undefined)
      return {
        from, to,
        taskDeadlines: events.filter((e) => !e.deadline).map((e) => ({ id: e.id, date: e.date, title: e.title, done: e.done, projectId: e.projectId, projectName: e.projectName })),
        projectDeadlines: events.filter((e) => e.deadline).map((e) => ({ date: e.date, title: e.title, projectId: e.projectId, projectName: e.projectName })),
        appointments: appts.map((x) => appointmentOut(x as Record<string, unknown>)),
      }
    },
  }),
]
