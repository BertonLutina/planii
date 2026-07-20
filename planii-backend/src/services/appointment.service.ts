import { q, one, many } from '../db/pool'
import { uid } from '../lib/utils'
import { fail } from '../core/http-error'
import { env } from '../config/env'
import * as ProjectModel from '../models/Project.model'
import * as UserModel from '../models/User.model'
import { mt } from '../lib/mail-i18n'
import { sendMail } from './mail.service'
import { logActivity, notify, bump } from './notification.service'

type AppointmentBody = {
  title?: string
  description?: string
  date?: string
  timeStart?: string
  timeEnd?: string
  participantIds?: string[]
}

function cleanTime(v: unknown) {
  const s = String(v || '').trim()
  return /^\d{2}:\d{2}$/.test(s) ? s : ''
}

function cleanDate(v: unknown) {
  const s = String(v || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

function formatSlot(date: string, start: string, end: string) {
  const d = new Date(date + 'T12:00:00')
  const label = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${label} · ${start} – ${end}`
}

function assertProjectOpen(p: Awaited<ReturnType<typeof ProjectModel.findById>>) {
  if (ProjectModel.isClosed(p)) fail(423, 'Projet clôturé : seule la réouverture ou la suppression est autorisée')
}

async function assertMember(projectId: string, userId: string) {
  const m = await ProjectModel.findMembership(projectId, userId)
  if (!m) fail(403, 'Non membre')
  return m
}

async function loadParticipants(appointmentId: string) {
  return many<{ id: string; name: string; email: string }>(
    `SELECT u.id, u.name, u.email, u.lang FROM appointment_participants ap
     JOIN users u ON u.id = ap.user_id WHERE ap.appointment_id = $1 ORDER BY u.name`,
    [appointmentId],
  )
}

async function sendAppointmentMails({
  project,
  actor,
  appointment,
  participants,
  kind,
}: {
  project: { id: string; name: string }
  actor: { id: string; name: string }
  appointment: { title: string; description?: string | null; date: string; timeStart: string; timeEnd: string }
  participants: { id: string; name: string; email: string; lang?: string | null }[]
  kind: 'created' | 'updated'
}) {
  const slot = formatSlot(appointment.date, appointment.timeStart, appointment.timeEnd)
  const subject = kind === 'created'
    ? `Rendez-vous : ${appointment.title}`
    : `Rendez-vous modifié : ${appointment.title}`
  const key = kind === 'created' ? 'apptNew' : 'apptUpd'
  const rowsFor = (l?: string | null): ([string, string] | null)[] => [
    [mt(l, 'r.project'), project.name],
    [mt(l, 'r.title'), appointment.title],
    [mt(l, 'r.slot'), slot],
    appointment.description ? [mt(l, 'r.desc'), appointment.description] : null,
    [mt(l, 'r.organizer'), actor.name],
  ]
  for (const p of participants) {
    if (!p.email) continue
    await sendMail(p.email, mt(p.lang, key + '.s', { title: appointment.title }), {
      intro: mt(p.lang, key + '.i', { actor: actor.name, project: project.name }),
      rows: rowsFor(p.lang),
      ctaText: mt(p.lang, 'cta'),
      ctaUrl: env.webUrl,
    })
    if (p.id !== actor.id) {
      await notify(
        p.id,
        kind === 'created' ? 'appointment_created' : 'appointment_updated',
        subject,
        `Projet « ${project.name} » · ${slot}`,
      )
    }
  }
}

function appointmentView(row: Record<string, unknown>, participants: { id: string; name: string }[]) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || null,
    date: row.appointment_date,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    createdBy: row.created_by,
    at: row.created_at,
    participants,
  }
}

export async function listAppointments(projectId: string, userId: string) {
  await assertMember(projectId, userId)
  const rows = await many(
    'SELECT * FROM appointments WHERE project_id=$1 ORDER BY appointment_date ASC, time_start ASC',
    [projectId],
  )
  const items = []
  for (const row of rows) {
    const participants = await loadParticipants(String(row.id))
    items.push(appointmentView(row, participants.map((p) => ({ id: p.id, name: p.name }))))
  }
  return items
}

export async function createAppointment(projectId: string, userId: string, body: AppointmentBody) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  await assertMember(p.id, userId)
  assertProjectOpen(p)

  const title = (body.title || '').trim()
  const description = (body.description || '').trim() || null
  const date = cleanDate(body.date)
  const timeStart = cleanTime(body.timeStart)
  const timeEnd = cleanTime(body.timeEnd)
  const participantIds = [...new Set((body.participantIds || []).map(String).filter(Boolean))]

  if (!title) fail(400, 'Intitulé requis')
  if (!date) fail(400, 'Date invalide')
  if (!timeStart || !timeEnd) fail(400, 'Créneau horaire invalide')
  if (timeStart >= timeEnd) fail(400, 'L’heure de fin doit être après l’heure de début')
  if (!participantIds.length) fail(400, 'Sélectionnez au moins un participant')

  const memberIds = new Set(
    (await many<{ user_id: string }>('SELECT user_id FROM memberships WHERE project_id=$1', [p.id]))
      .map((m) => m.user_id),
  )
  for (const pid of participantIds) {
    if (!memberIds.has(pid)) fail(400, 'Participant invalide')
  }

  const appointmentId = uid()
  await q(
    `INSERT INTO appointments (id, project_id, title, description, appointment_date, time_start, time_end, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [appointmentId, p.id, title, description, date, timeStart, timeEnd, userId],
  )
  for (const pid of participantIds) {
    await q('INSERT INTO appointment_participants (appointment_id, user_id) VALUES ($1,$2)', [appointmentId, pid])
  }

  const actor = await UserModel.findById(userId)
  const participants = await loadParticipants(appointmentId)
  const slot = formatSlot(date, timeStart, timeEnd)
  await logActivity(p.id, userId, 'appointment_created', `a planifié un rendez-vous : « ${title} » (${slot})`)
  bump(p.id)

  if (actor) {
    sendAppointmentMails({
      project: p,
      actor,
      appointment: { title, description, date, timeStart, timeEnd },
      participants,
      kind: 'created',
    }).catch(() => {})
  }

  return appointmentId
}

export async function updateAppointment(appointmentId: string, userId: string, body: AppointmentBody) {
  const row = await one('SELECT * FROM appointments WHERE id=$1', [appointmentId])
  if (!row) fail(404, 'Rendez-vous introuvable')

  const p = await ProjectModel.findById(row.project_id)
  if (!p) fail(404, 'Projet introuvable')
  const m = await assertMember(p.id, userId)
  assertProjectOpen(p)

  const canEdit = row.created_by === userId || ProjectModel.canManageRole(m.role)
  if (!canEdit) fail(403, 'Seul le créateur ou un responsable peut modifier ce rendez-vous')

  const title = (body.title || '').trim()
  const description = (body.description || '').trim() || null
  const date = cleanDate(body.date)
  const timeStart = cleanTime(body.timeStart)
  const timeEnd = cleanTime(body.timeEnd)
  const participantIds = [...new Set((body.participantIds || []).map(String).filter(Boolean))]

  if (!title) fail(400, 'Intitulé requis')
  if (!date) fail(400, 'Date invalide')
  if (!timeStart || !timeEnd) fail(400, 'Créneau horaire invalide')
  if (timeStart >= timeEnd) fail(400, 'L’heure de fin doit être après l’heure de début')
  if (!participantIds.length) fail(400, 'Sélectionnez au moins un participant')

  const memberIds = new Set(
    (await many<{ user_id: string }>('SELECT user_id FROM memberships WHERE project_id=$1', [p.id]))
      .map((x) => x.user_id),
  )
  for (const pid of participantIds) {
    if (!memberIds.has(pid)) fail(400, 'Participant invalide')
  }

  await q(
    `UPDATE appointments SET title=$1, description=$2, appointment_date=$3, time_start=$4, time_end=$5
     WHERE id=$6`,
    [title, description, date, timeStart, timeEnd, appointmentId],
  )
  await q('DELETE FROM appointment_participants WHERE appointment_id=$1', [appointmentId])
  for (const pid of participantIds) {
    await q('INSERT INTO appointment_participants (appointment_id, user_id) VALUES ($1,$2)', [appointmentId, pid])
  }

  const actor = await UserModel.findById(userId)
  const participants = await loadParticipants(appointmentId)
  const slot = formatSlot(date, timeStart, timeEnd)
  await logActivity(p.id, userId, 'appointment_updated', `a modifié le rendez-vous : « ${title} » (${slot})`)
  bump(p.id)

  if (actor) {
    sendAppointmentMails({
      project: p,
      actor,
      appointment: { title, description, date, timeStart, timeEnd },
      participants,
      kind: 'updated',
    }).catch(() => {})
  }
}

export async function deleteAppointment(appointmentId: string, userId: string) {
  const row = await one('SELECT * FROM appointments WHERE id=$1', [appointmentId])
  if (!row) fail(404, 'Rendez-vous introuvable')

  const p = await ProjectModel.findById(row.project_id)
  if (!p) fail(404, 'Projet introuvable')
  const m = await assertMember(p.id, userId)
  assertProjectOpen(p)

  const canDelete = row.created_by === userId || ProjectModel.canManageRole(m.role)
  if (!canDelete) fail(403, 'Seul le créateur ou un responsable peut supprimer ce rendez-vous')

  await q('DELETE FROM appointments WHERE id=$1', [appointmentId])
  await logActivity(p.id, userId, 'appointment_deleted', `a supprimé le rendez-vous : « ${row.title} »`)
  bump(p.id)
}

export async function appointmentsForProject(projectId: string) {
  const rows = await many(
    'SELECT * FROM appointments WHERE project_id=$1 ORDER BY appointment_date ASC, time_start ASC',
    [projectId],
  )
  const items = []
  for (const row of rows) {
    const participants = await many<{ id: string; name: string }>(
      `SELECT u.id, u.name FROM appointment_participants ap
       JOIN users u ON u.id = ap.user_id WHERE ap.appointment_id = $1 ORDER BY u.name`,
      [row.id],
    )
    items.push(appointmentView(row, participants))
  }
  return items
}
