import { q, one, many, pool } from '../db/pool'
import { env } from '../config/env'
import { uid, numOrNull, prioOrDefault } from '../lib/utils'
import { fail } from '../core/http-error'
import type { DbUser } from '../models/User.model'
import * as TaskModel from '../models/Task.model'
import * as ProjectModel from '../models/Project.model'
import * as UserModel from '../models/User.model'
import * as TaskView from '../views/Task.view'
import { assertProjectOpen, ensureProjectStatuses, sendTaskAssignmentMails } from './project.service'
import { logActivity, recordTaskEvent, notify, notifyProject, bump } from './notification.service'
import { sendMail } from './mail.service'

export async function reorderTasks(projectId: string, userId: string, ids: string[]) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  assertProjectOpen(p)
  const m = await ProjectModel.findMembership(projectId, userId)
  if (!m) fail(403, 'Non membre')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < ids.length; i++) await client.query('UPDATE tasks SET position=$1 WHERE id=$2 AND project_id=$3', [i, ids[i], projectId])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
  bump(projectId)
}

export async function createTask(projectId: string, user: DbUser, body: Record<string, unknown>) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, user.id)
  if (!m) fail(403, 'Non membre')
  assertProjectOpen(p)
  const title = String(body.title || '').trim()
  if (!title) fail(400, 'Intitulé requis')
  const assignee = (body.assigneeId as string) || null
  if (assignee && !(await ProjectModel.findMembership(p.id, assignee))) fail(400, 'Le responsable doit être membre')
  const id = uid()
  const est = numOrNull(body.estHours)
  const prio = prioOrDefault(body.priority)
  const description = ((body.description || '') as string).trim() || null
  const type = ((body.type || '') as string).trim().slice(0, 30) || null
  const transferable = body.transferable === true
  const statuses = await ensureProjectStatuses(p.id)
  const statusKey = statuses.some((s) => s.key === body.statusKey) ? (body.statusKey as string) : 'todo'
  if (statusKey === 'transferred' && !transferable) fail(400, 'Cette tâche doit être marquée transférable')
  let parentId = (body.parentId as string) || null
  if (parentId) {
    const parent = await TaskModel.findById(parentId)
    if (!parent || parent.project_id !== p.id) fail(400, 'Tâche parente invalide')
    if (parent.parent_id) parentId = parent.parent_id
  }
  await q('INSERT INTO tasks (id,project_id,title,description,type,assignee_id,created_by,due,est_hours,priority,parent_id,status_key,done,done_at,transferable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
    [id, p.id, title, description, type, assignee, user.id, body.due || null, est, prio, parentId, statusKey, statusKey === 'done', statusKey === 'done' ? new Date().toISOString() : null, transferable])
  await logActivity(p.id, user.id, 'task_created', `a ajouté « ${title} »`)
  await recordTaskEvent(id, p.id, user.id, 'task_created', { title, assigneeId: assignee, due: body.due || null, priority: prio, statusKey })
  ;(async () => {
    if (assignee) {
      await sendTaskAssignmentMails({ project: p, task: { id, title, priority: prio, due: (body.due as string) || null }, actor: user, assigneeId: assignee })
    } else {
      const rows: ([string, string] | null)[] = [['Projet', p.name], ['Priorité', 'P' + prio], type ? ['Type', type] : null, body.due ? ['Échéance', body.due as string] : null]
      for (const manager of await UserModel.projectManagers(p.id)) {
        if (manager.email && manager.id !== user.id) await sendMail(manager.email, `Nouvelle tâche dans « ${p.name} » : ${title}`, { intro: `${user.name} a ajouté une tâche non assignée au projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env.webUrl })
      }
    }
  })().catch((e) => console.error('mail task_created', (e as Error).message))
  return { id, title, description, type, assigneeId: assignee, createdBy: user.id, due: body.due || null, done: statusKey === 'done', estHours: est, spentHours: null, priority: prio, parentId, statusKey, transferable }
}

export async function updateTask(taskId: string, user: DbUser, body: Record<string, unknown>) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, user.id)
  if (!m) fail(403, 'Non membre')
  const p = await ProjectModel.findById(t.project_id)
  assertProjectOpen(p)
  const b = body || {}
  const isCreator = t.created_by === user.id
  const isAssignee = t.assignee_id === user.id
  const manage = ProjectModel.canManageRole(m.role)

  if (typeof b.done === 'boolean') {
    if (!isAssignee) fail(403, 'Seul le responsable de la tâche peut la cocher')
    await q('UPDATE tasks SET done=$1, done_at=$2, status_key=$3 WHERE id=$4', [b.done, b.done ? new Date().toISOString() : null, b.done ? 'done' : 'todo', t.id])
    if (b.done) await logActivity(t.project_id, user.id, 'task_done', `a terminé « ${t.title} »`)
    await recordTaskEvent(t.id, t.project_id, user.id, b.done ? 'task_done' : 'task_reopened', { title: t.title })
  }

  if ('statusKey' in b || 'transferredTo' in b) {
    if (!(isAssignee || isCreator || manage)) fail(403, 'Statut réservé au responsable, au créateur ou au propriétaire')
    const statuses = await ensureProjectStatuses(t.project_id)
    const nextStatus = statuses.some((s) => s.key === b.statusKey) ? (b.statusKey as string) : t.status_key || 'todo'
    let transferredTo = 'transferredTo' in b ? ((b.transferredTo as string) || null) : t.transferred_to
    if (transferredTo && !(await ProjectModel.findMembership(t.project_id, transferredTo))) fail(400, 'Le destinataire doit être membre')
    const isTransfer = nextStatus === 'transferred'
    if (isTransfer && !t.transferable) fail(400, 'Cette tâche n’est pas transférable')
    if (isTransfer && !transferredTo) fail(400, 'Choisissez la personne à qui transférer')
    if (isTransfer && transferredTo === t.assignee_id) fail(400, 'Choisissez une autre personne')
    const done = nextStatus === 'done'
    await q(`UPDATE tasks SET status_key=$1, done=$2, done_at=$3, transferred_from=$4, transferred_to=$5, assignee_id=$6 WHERE id=$7`,
      [nextStatus, done, done ? (t.done_at || new Date().toISOString()) : null, isTransfer ? (t.assignee_id || user.id) : null, isTransfer ? transferredTo : null, isTransfer ? transferredTo : t.assignee_id, t.id])
    await logActivity(t.project_id, user.id, 'task_status', `a déplacé « ${t.title} » vers ${nextStatus}`)
    await recordTaskEvent(t.id, t.project_id, user.id, isTransfer ? 'task_transferred' : 'task_status_changed', { fromStatus: t.status_key || 'todo', toStatus: nextStatus, transferredTo })
    if (isTransfer) {
      await q('INSERT INTO task_transfers (id,task_id,project_id,from_user_id,to_user_id,created_by) VALUES ($1,$2,$3,$4,$5,$6)',
        [uid(), t.id, t.project_id, t.assignee_id || user.id, transferredTo, user.id])
      if (transferredTo !== user.id) await notify(transferredTo, 'task_transferred', `Tâche transférée : ${t.title}`, `${user.name} vous a transféré une tâche.`)
      const proj = await ProjectModel.findById(t.project_id)
      await sendTaskAssignmentMails({ project: proj!, task: { id: t.id, title: t.title, priority: t.priority, due: t.due }, actor: user, assigneeId: transferredTo })
    }
  }

  if ('estHours' in b || 'spentHours' in b) {
    if (!(isAssignee || manage)) fail(403, 'Heures réservées au responsable ou au propriétaire')
    const sets: string[] = []
    const vals: unknown[] = []
    if ('estHours' in b) { sets.push(`est_hours=$${sets.length + 1}`); vals.push(numOrNull(b.estHours)) }
    if ('spentHours' in b) { sets.push(`spent_hours=$${sets.length + 1}`); vals.push(numOrNull(b.spentHours)) }
    if (sets.length) { vals.push(t.id); await q(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals) }
    await recordTaskEvent(t.id, t.project_id, user.id, 'task_hours_updated', { estHours: 'estHours' in b ? numOrNull(b.estHours) : undefined, spentHours: 'spentHours' in b ? numOrNull(b.spentHours) : undefined })
  }

  if ('priority' in b) {
    if (!(isAssignee || isCreator || manage)) fail(403, 'Priorité réservée au responsable, au créateur ou au propriétaire')
    const n = parseInt(String(b.priority), 10)
    if (!(n >= 1 && n <= 6)) fail(400, 'Priorité invalide (1 à 6)')
    await q('UPDATE tasks SET priority=$1 WHERE id=$2', [n, t.id])
    await recordTaskEvent(t.id, t.project_id, user.id, 'task_priority_changed', { fromPriority: t.priority || 6, toPriority: n })
  }

  if ('title' in b || 'description' in b || 'type' in b || 'due' in b || 'assigneeId' in b || 'transferable' in b) {
    if (!(isCreator || manage)) fail(403, 'Modification réservée au créateur ou au propriétaire')
    const sets: string[] = []
    const vals: unknown[] = []
    let nextTitle = t.title
    let nextDue = t.due || null
    let nextAssignee = t.assignee_id || null
    if ('title' in b) {
      const title = ((b.title || '') as string).trim()
      if (!title) fail(400, 'Intitulé requis')
      sets.push(`title=$${sets.length + 1}`)
      vals.push(title)
      nextTitle = title
    }
    if ('description' in b) { sets.push(`description=$${sets.length + 1}`); vals.push(((b.description || '') as string).trim() || null) }
    if ('type' in b) { sets.push(`type=$${sets.length + 1}`); vals.push(((b.type || '') as string).trim().slice(0, 30) || null) }
    if ('due' in b) { sets.push(`due=$${sets.length + 1}`); vals.push(b.due || null); nextDue = (b.due as string) || null }
    if ('assigneeId' in b) {
      const a = (b.assigneeId as string) || null
      if (a && !(await ProjectModel.findMembership(t.project_id, a))) fail(400, 'Le responsable doit être membre')
      sets.push(`assignee_id=$${sets.length + 1}`)
      vals.push(a)
      nextAssignee = a
    }
    if ('transferable' in b) { sets.push(`transferable=$${sets.length + 1}`); vals.push(b.transferable === true) }
    if (sets.length) { vals.push(t.id); await q(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals) }
    await logActivity(t.project_id, user.id, 'task_updated', `a modifié « ${t.title} »`)
    await recordTaskEvent(t.id, t.project_id, user.id, 'task_updated', { title: nextTitle, assigneeId: nextAssignee, due: nextDue })
    if ('assigneeId' in b && nextAssignee && nextAssignee !== t.assignee_id) {
      const proj = await ProjectModel.findById(t.project_id)
      await sendTaskAssignmentMails({ project: proj!, task: { id: t.id, title: nextTitle, priority: t.priority || b.priority, due: nextDue }, actor: user, assigneeId: nextAssignee })
    }
  }

  bump(t.project_id)
}

export async function claimTask(taskId: string, userId: string) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, userId)
  if (!m) fail(403, 'Non membre')
  const p = await ProjectModel.findById(t.project_id)
  assertProjectOpen(p)
  if (t.assignee_id) fail(409, 'Tâche déjà prise')
  await q('UPDATE tasks SET assignee_id=$1 WHERE id=$2', [userId, t.id])
  await logActivity(t.project_id, userId, 'task_claimed', `a pris « ${t.title} »`)
  await recordTaskEvent(t.id, t.project_id, userId, 'task_claimed', { assigneeId: userId })
}

export async function remindTask(taskId: string, user: DbUser) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, user.id)
  if (!m) fail(403, 'Non membre')
  const p = await ProjectModel.findById(t.project_id)
  assertProjectOpen(p)
  if (!t.assignee_id) fail(400, 'Cette tâche n’a pas de responsable')
  const manage = ProjectModel.canManageRole(m.role)
  if (!(manage || t.created_by === user.id)) fail(403, 'Relance réservée au créateur ou au responsable du projet')
  const assignee = await UserModel.findById(t.assignee_id)
  if (!assignee || !assignee.email) fail(400, 'Pas d’email pour ce responsable')
  const rows: ([string, string] | null)[] = [['Projet', p!.name], ['Tâche', t.title], ['Responsable', assignee.name], t.due ? ['Échéance', t.due] : null, ['Priorité', 'P' + (t.priority || 6)]]
  await sendMail(assignee.email, `Relance : « ${t.title} »`, {
    intro: `${user.name} vous relance pour la tâche « ${t.title} » dans le projet « ${p!.name} ».`,
    rows,
    ctaText: 'Ouvrir Planii',
    ctaUrl: env.webUrl,
  })
  await notify(assignee.id, 'task_reminder', `Relance : ${t.title}`, `${user.name} vous a relancé.`)
  await logActivity(t.project_id, user.id, 'task_reminded', `a relancé « ${t.title} »`)
  await recordTaskEvent(t.id, t.project_id, user.id, 'task_reminded', { assigneeId: assignee.id })
}

export async function deleteTask(taskId: string, userId: string) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, userId)
  if (!m) fail(403, 'Non membre')
  const p = await ProjectModel.findById(t.project_id)
  assertProjectOpen(p)
  if (t.created_by !== userId && !ProjectModel.canManageRole(m.role)) fail(403, 'Suppression réservée au créateur ou au propriétaire')
  await recordTaskEvent(t.id, t.project_id, userId, 'task_deleted', { title: t.title })
  await q('DELETE FROM tasks WHERE id=$1 OR parent_id=$1', [t.id])
  bump(t.project_id)
}

export async function listComments(taskId: string, userId: string) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, userId)
  if (!m) fail(403, 'Non membre')
  const rows = await many(
    `SELECT c.*, u.name AS user_name
    FROM task_comments c JOIN users u ON u.id=c.user_id
    WHERE c.task_id=$1 ORDER BY c.created_at ASC`, [t.id])
  const manage = ProjectModel.canManageRole(m.role)
  return rows.map((c) => TaskView.comment({ ...c, canDelete: !c.deleted_at && (manage || c.user_id === userId) }))
}

export async function addComment(taskId: string, user: DbUser, body: string) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, user.id)
  if (!m) fail(403, 'Non membre')
  const p = await ProjectModel.findById(t.project_id)
  assertProjectOpen(p)
  const text = String(body || '').trim().slice(0, 2000)
  if (!text) fail(400, 'Commentaire vide')
  const id = uid()
  await q('INSERT INTO task_comments (id,task_id,project_id,user_id,body) VALUES ($1,$2,$3,$4,$5)', [id, t.id, t.project_id, user.id, text])
  await recordTaskEvent(t.id, t.project_id, user.id, 'comment_added', { commentId: id })
  const targets = [...new Set([t.assignee_id, t.created_by].filter(Boolean).filter((x) => x !== user.id))]
  for (const targetId of targets) await notify(targetId as string, 'task_comment', `Commentaire : ${t.title}`, `${user.name} a commenté une tâche.`)
  await notifyProject(t.project_id, { type: 'project', projectId: t.project_id })
  return { id, taskId: t.id, projectId: t.project_id, userId: user.id, userName: user.name, body: text, deleted: false, canDelete: true, at: new Date().toISOString() }
}

export async function deleteComment(commentId: string, userId: string) {
  const c = await one('SELECT * FROM task_comments WHERE id=$1', [commentId])
  if (!c) fail(404, 'Commentaire introuvable')
  const m = await ProjectModel.findMembership(c.project_id, userId)
  if (!m) fail(403, 'Non membre')
  if (c.deleted_at) return
  if (c.user_id !== userId && !ProjectModel.canManageRole(m.role)) fail(403, 'Suppression réservée à l’auteur ou au chef du projet')
  const p = await ProjectModel.findById(c.project_id)
  assertProjectOpen(p)
  await q('UPDATE task_comments SET deleted_at=now() WHERE id=$1', [c.id])
  await recordTaskEvent(c.task_id, c.project_id, userId, 'comment_deleted', { commentId: c.id })
  await notifyProject(c.project_id, { type: 'project', projectId: c.project_id })
}

export async function listEvents(taskId: string, userId: string) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const m = await ProjectModel.findMembership(t.project_id, userId)
  if (!m) fail(403, 'Non membre')
  const rows = await many(
    `SELECT e.*, u.name AS actor_name
    FROM task_events e LEFT JOIN users u ON u.id=e.actor_id
    WHERE e.task_id=$1 ORDER BY e.created_at ASC`, [t.id])
  return rows.map((e) => TaskView.event({ ...e, payload: e.payload || {} }))
}

export async function listMyTasks(userId: string) {
  const taskRows = await many(
    `WITH mine AS (
      SELECT t.id FROM tasks t
      JOIN memberships m ON m.project_id = t.project_id AND m.user_id = $1
      WHERE t.assignee_id = $1
    )
    SELECT t.*, p.id AS project_id, p.name AS project_name, p.type AS project_type, p.status AS project_status,
      p.owner_id AS project_owner_id, p.deadline AS project_deadline, m.role AS my_role
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN memberships m ON m.project_id = p.id AND m.user_id = $1
    WHERE t.id IN (SELECT id FROM mine) OR t.parent_id IN (SELECT id FROM mine)
    ORDER BY t.priority ASC, t.created_at ASC`,
    [userId],
  )

  const projectIds = [...new Set(taskRows.map((r) => r.project_id as string))]
  const projects = []
  for (const pid of projectIds) {
    const sample = taskRows.find((r) => r.project_id === pid)!
    const members = (await many<{ id: string; role: string; name: string; email: string; job: string }>(
      `SELECT m.user_id AS id, m.role, u.name, u.email, u.job
        FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY m.joined_at`,
      [pid],
    )).map((m) => ({ id: m.id, role: m.role, name: m.name, email: m.email, job: m.job || '' }))
    const projectTasks = taskRows.filter((r) => r.project_id === pid).map((t) => TaskView.fromRow(t))
    projects.push({
      id: pid,
      name: sample.project_name,
      type: sample.project_type,
      status: sample.project_status,
      owner_id: sample.project_owner_id,
      deadline: sample.project_deadline,
      my_role: sample.my_role,
      members,
      tasks: projectTasks,
      polls: [],
      activity: [],
      roles: [],
      statuses: [],
      taskCount: projectTasks.length,
      doneCount: projectTasks.filter((t) => t.done).length,
    })
  }
  return projects
}
