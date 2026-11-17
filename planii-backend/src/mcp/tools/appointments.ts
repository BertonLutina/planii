import { z } from 'zod'
import { tool } from '../tooling'
import { one } from '../../db/pool'
import { fail } from '../../core/http-error'
import * as AppointmentService from '../../services/appointment.service'
import * as ProjectModel from '../../models/Project.model'
import { appointmentOut } from '../views'

const id = z.string().min(1).max(64)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format AAAA-MM-JJ')
const time = z.string().regex(/^\d{2}:\d{2}$/, 'format HH:MM (24 h)')

/** Relit un rendez-vous (les services de création/modification ne renvoient pas l'objet). */
async function reload(projectId: string, appointmentId: string, userId: string) {
  const items = await AppointmentService.listAppointments(projectId, userId)
  const found = items.find((x) => x.id === appointmentId)
  return appointmentOut({ ...((found || { id: appointmentId }) as Record<string, unknown>), projectId })
}

export const appointmentTools = [
  tool({
    name: 'planii_list_appointments',
    title: 'Rendez-vous',
    description: 'Liste mes rendez-vous entre deux dates (AAAA-MM-JJ, 62 jours max), tous projets ou un seul projet.',
    scope: 'planii:read',
    input: { from: date, to: date, projectId: id.optional() },
    summarize: (a) => `${a.from} → ${a.to}`,
    handler: async (a, p) => {
      const span = (new Date(String(a.to)).getTime() - new Date(String(a.from)).getTime()) / 864e5
      if (span > 62) return { error: 'Période trop longue (62 jours max).' }
      const items = await AppointmentService.listMyAppointments(p.user.id, String(a.from), String(a.to), a.projectId ? String(a.projectId) : undefined)
      return { appointments: items.map((x) => appointmentOut(x as Record<string, unknown>)) }
    },
  }),
  tool({
    name: 'planii_create_appointment',
    title: 'Planifier un rendez-vous',
    description: 'Crée un rendez-vous dans un projet (les participants reçoivent la notification habituelle de Planii). Heures au format 24 h HH:MM, date AAAA-MM-JJ.',
    scope: 'planii:write',
    input: {
      projectId: id, title: z.string().min(1).max(200), description: z.string().max(5000).optional(),
      date, timeStart: time, timeEnd: time,
      participantIds: z.array(id).max(50).optional().describe('ids de membres du projet (voir planii_get_project)'),
    },
    summarize: (a) => `créer rendez-vous « ${a.title} » le ${a.date} (projet ${a.projectId})`,
    handler: async (a, p) => {
      const body: Record<string, unknown> = { title: a.title, date: a.date, timeStart: a.timeStart, timeEnd: a.timeEnd }
      if (a.description !== undefined) body.description = a.description
      if (a.participantIds !== undefined) body.participantIds = a.participantIds
      const newId = await AppointmentService.createAppointment(String(a.projectId), p.user.id, body)
      return { appointment: await reload(String(a.projectId), newId, p.user.id) }
    },
  }),
  tool({
    name: 'planii_update_appointment',
    title: 'Modifier un rendez-vous',
    description: 'Modifie un rendez-vous (créateur ou responsable du projet). Seuls les champs fournis changent ; pour les participants, fournir la liste complète souhaitée.',
    scope: 'planii:write',
    input: {
      appointmentId: id, title: z.string().min(1).max(200).optional(), description: z.string().max(5000).optional(),
      date: date.optional(), timeStart: time.optional(), timeEnd: time.optional(), participantIds: z.array(id).max(50).optional(),
    },
    summarize: (a) => `modifier rendez-vous ${a.appointmentId}`,
    handler: async (a, p) => {
      const row = await one<Record<string, unknown>>('SELECT * FROM appointments WHERE id=$1', [String(a.appointmentId)])
      if (!row) fail(404, 'Rendez-vous introuvable')
      if (!(await ProjectModel.findMembership(String(row.project_id), p.user.id))) fail(403, 'Non membre')
      // Le service remplace tous les champs : on repart des valeurs actuelles pour ne changer que ce qui est demandé.
      const body: Record<string, unknown> = {
        title: a.title ?? row.title, description: a.description ?? row.description ?? '',
        date: a.date ?? row.appointment_date, timeStart: a.timeStart ?? row.time_start, timeEnd: a.timeEnd ?? row.time_end,
      }
      if (a.participantIds !== undefined) body.participantIds = a.participantIds
      else {
        const cur = await AppointmentService.listAppointments(String(row.project_id), p.user.id)
        const me = cur.find((x) => x.id === row.id)
        body.participantIds = (me?.participants || []).map((x: { id: string }) => x.id)
      }
      await AppointmentService.updateAppointment(String(a.appointmentId), p.user.id, body)
      return { appointment: await reload(String(row.project_id), String(a.appointmentId), p.user.id) }
    },
  }),
  tool({
    name: 'planii_delete_appointment',
    title: 'Supprimer un rendez-vous',
    description: 'SUPPRIME définitivement un rendez-vous (irréversible). Premier appel sans confirm : renvoie un récapitulatif à montrer à l’utilisateur. Ne rappeler avec confirm=true qu’après son accord explicite.',
    scope: 'planii:delete',
    input: { appointmentId: id, confirm: z.boolean().default(false) },
    summarize: (a) => `supprimer rendez-vous ${a.appointmentId}${a.confirm === true ? '' : ' (en attente de confirmation)'}`,
    handler: async (a, p) => {
      const row = await one<Record<string, unknown>>('SELECT * FROM appointments WHERE id=$1', [String(a.appointmentId)])
      if (!row) fail(404, 'Rendez-vous introuvable')
      if (!(await ProjectModel.findMembership(String(row.project_id), p.user.id))) fail(403, 'Non membre')
      if (a.confirm !== true) {
        return { needsConfirmation: true, message: `Demandez à l’utilisateur de confirmer la suppression définitive du rendez-vous « ${row.title} » du ${row.appointment_date} ${row.time_start}, puis rappelez cet outil avec confirm=true.` }
      }
      await AppointmentService.deleteAppointment(String(a.appointmentId), p.user.id)
      return { deleted: true, title: row.title }
    },
  }),
]
