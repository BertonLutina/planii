import { q, one, many, pool } from '../db/pool'
import { uid, prioOrDefault } from '../lib/utils'
import { fail } from '../core/http-error'
import type { DbUser } from '../models/User.model'
import * as ProjectModel from '../models/Project.model'
import { assertProjectOpen, ensureProjectStatuses, sendTaskAssignmentMails } from './project.service'
import { logActivity, notifyProject, recordTaskEvent } from './notification.service'

export async function listMessages(projectId: string, userId: string) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, userId)
  if (!m) fail(403, 'Non membre')
  assertProjectOpen(p)
  const rows = await many(
    `SELECT mm.*, u.name AS user_name
    FROM meeting_messages mm JOIN users u ON u.id=mm.user_id
    WHERE mm.project_id=$1 ORDER BY mm.created_at ASC LIMIT 200`, [p.id])
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    userName: row.user_name,
    body: row.body,
    createdTaskId: row.created_task_id || null,
    at: row.created_at,
  }))
}

export async function postMessage(projectId: string, user: DbUser, body: string) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, user.id)
  if (!m) fail(403, 'Non membre')
  assertProjectOpen(p)
  const text = String(body || '').trim().slice(0, 1200)
  if (!text) fail(400, 'Message vide')
  const id = uid()
  await q('INSERT INTO meeting_messages (id,project_id,user_id,body) VALUES ($1,$2,$3,$4)', [id, p.id, user.id, text])
  await notifyProject(p.id, { type: 'meeting_chat', projectId: p.id })
  return { id, projectId: p.id, userId: user.id, userName: user.name, body: text, createdTaskId: null, at: new Date().toISOString() }
}

export async function listTaskDelegates(projectId: string, userId: string) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, userId)
  if (!m) fail(403, 'Non membre')
  assertProjectOpen(p)
  const rows = await many('SELECT user_id FROM project_meeting_task_delegates WHERE project_id=$1', [p.id])
  return rows.map((row) => row.user_id)
}

export async function setTaskDelegates(projectId: string, userId: string, userIds: unknown[]) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, userId)
  if (!m || !ProjectModel.canManageRole(m.role)) fail(403, 'Réservé au chef du projet')
  assertProjectOpen(p)
  const wanted = Array.isArray(userIds) ? [...new Set(userIds.filter(Boolean))] : []
  const members = await ProjectModel.findMembers(p.id)
  const memberIds = new Set(members.map((x) => x.user_id))
  const ids = wanted.filter((id): id is string => typeof id === 'string' && memberIds.has(id))
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM project_meeting_task_delegates WHERE project_id=$1', [p.id])
    for (const id of ids) await client.query('INSERT INTO project_meeting_task_delegates (project_id,user_id,created_by) VALUES ($1,$2,$3)', [p.id, id, userId])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
  await notifyProject(p.id, { type: 'meeting_chat', projectId: p.id })
  return ids
}

export async function createMeetingTask(projectId: string, user: DbUser, body: Record<string, unknown>) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, user.id)
  assertProjectOpen(p)
  const delegated = await one('SELECT 1 FROM project_meeting_task_delegates WHERE project_id=$1 AND user_id=$2', [p.id, user.id])
  if (!m || !(ProjectModel.canManageRole(m.role) || delegated)) fail(403, 'Vous n’êtes pas autorisé à créer des tâches depuis ce meeting')
  const title = String(body.title || '').trim().slice(0, 160)
  if (!title) fail(400, 'Titre requis')
  const assignee = (body.assigneeId as string) || null
  if (assignee && !(await ProjectModel.findMembership(p.id, assignee))) fail(400, 'Le responsable doit être membre')
  const statuses = await ensureProjectStatuses(p.id)
  const statusKey = statuses.some((s) => s.key === body.statusKey) ? (body.statusKey as string) : 'todo'
  const prio = prioOrDefault(body.priority)
  const description = String(body.description || '').trim().slice(0, 1000) || null
  const transferable = body.transferable === true
  const id = uid()
  if (statusKey === 'transferred' && !transferable) fail(400, 'Cette tâche doit être marquée transférable')
  await q('INSERT INTO tasks (id,project_id,title,description,type,assignee_id,created_by,due,priority,status_key,done,done_at,transferable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
    [id, p.id, title, description, 'Tâche', assignee, user.id, body.due || null, prio, statusKey, statusKey === 'done', statusKey === 'done' ? new Date().toISOString() : null, transferable])
  await recordTaskEvent(id, p.id, user.id, 'task_created', { title, assigneeId: assignee, due: body.due || null, priority: prio, statusKey, source: 'meeting' })
  const sourceMessageId = (body.messageId as string) || null
  if (sourceMessageId) await q('UPDATE meeting_messages SET created_task_id=$1 WHERE id=$2 AND project_id=$3', [id, sourceMessageId, p.id])
  await logActivity(p.id, user.id, 'meeting_task_created', `a créé depuis le meeting « ${title} »`)
  if (assignee) {
    await sendTaskAssignmentMails({ project: p, task: { id, title, priority: prio, due: (body.due as string) || null }, actor: user, assigneeId: assignee, source: 'meeting' })
  }
  await notifyProject(p.id, { type: 'meeting_chat', projectId: p.id })
  await notifyProject(p.id, { type: 'project', projectId: p.id })
  return { id, title, description, type: 'Tâche', assigneeId: assignee, createdBy: user.id, due: body.due || null, done: statusKey === 'done', priority: prio, statusKey, transferable }
}
