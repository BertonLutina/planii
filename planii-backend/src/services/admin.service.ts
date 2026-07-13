import { q, one, many, pool } from '../db/pool'
import { env } from '../config/env'
import { uid } from '../lib/utils'
import { fail, HttpError } from '../core/http-error'
import type { DbUser } from '../models/User.model'
import * as TaskModel from '../models/Task.model'
import * as ProjectModel from '../models/Project.model'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'
import * as AdminView from '../views/Admin.view'
import { audit } from './audit.service'
import { imapList, imapRead } from './imap.service'
import { sendRaw } from './mail.service'
import { deleteProjectCascade } from './project.service'
import { parsePagination, paginated } from '../lib/pagination'

export async function getStats() {
  const n = async (sql: string) => Number((await one(sql, []))!.c)
  const users = await n('SELECT count(*)::int AS c FROM users')
  const projects = await n('SELECT count(*)::int AS c FROM projects')
  const projectsActive = await n(`SELECT count(*)::int AS c FROM projects WHERE status <> 'done'`)
  const tasks = await n('SELECT count(*)::int AS c FROM tasks')
  const tasksDone = await n('SELECT count(*)::int AS c FROM tasks WHERE done')
  const tasksOverdue = await n(`SELECT count(*)::int AS c FROM tasks WHERE NOT done AND due IS NOT NULL AND due < to_char(now(),'YYYY-MM-DD')`)
  const active7 = await n(`SELECT count(*)::int AS c FROM users WHERE last_login > now() - interval '7 days'`)
  const prioRows = await many('SELECT priority, count(*)::int AS c FROM tasks GROUP BY priority', [])
  const tasksByPriority = [1, 2, 3, 4, 5, 6].map((p) => ({ p, c: (prioRows.find((row) => Number(row.priority) === p) || {}).c || 0 }))
  const typeRows = await many('SELECT type, count(*)::int AS c FROM projects GROUP BY type', [])
  const projectsByType = ['solo', 'team', 'group'].map((t) => ({ t, c: (typeRows.find((row) => row.type === t) || {}).c || 0 }))
  const doneRows = await many(`SELECT to_char(done_at,'YYYY-MM-DD') AS d, count(*)::int AS c FROM tasks WHERE done AND done_at > now() - interval '14 days' GROUP BY d`, [])
  const doneByDay = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
    doneByDay.push({ d, c: (doneRows.find((row) => row.d === d) || {}).c || 0 })
  }
  const recentLogins = (await many('SELECT name, email, last_login FROM users WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 8', []))
    .map((u) => ({ name: u.name, email: u.email, lastLogin: u.last_login }))
  return {
    users, projects, projectsActive, tasks, tasksDone, tasksOpen: tasks - tasksDone, tasksOverdue,
    completion: tasks ? Math.round((tasksDone / tasks) * 100) : 0, activeUsers7: active7,
    tasksByPriority, projectsByType, doneByDay, recentLogins,
  }
}

export async function listUsers(query: Record<string, unknown> = {}) {
  const { page, limit, offset } = parsePagination(query, { limit: 30 })
  const countRow = await one<{ c: number }>('SELECT count(*)::int AS c FROM users', [])
  const total = Number(countRow.c) || 0
  const users = await many(
    `SELECT u.id, u.name, u.email, u.first_name, u.last_name, u.is_admin, u.created_at, u.last_login,
      (SELECT count(*)::int FROM memberships m WHERE m.user_id=u.id) AS project_count,
      (SELECT count(*)::int FROM tasks t WHERE t.assignee_id=u.id AND NOT t.done) AS tasks_open,
      (SELECT count(*)::int FROM tasks t WHERE t.assignee_id=u.id AND t.done) AS tasks_done,
      (SELECT coalesce(sum(
        CASE
          WHEN t.due IS NULL THEN 10
          WHEN t.done_at::date < NULLIF(t.due,'')::date THEN 20
          WHEN t.done_at::date = NULLIF(t.due,'')::date THEN 15
          ELSE 5
        END
      ), 0)::int FROM tasks t WHERE t.assignee_id=u.id AND t.done) AS points
    FROM users u ORDER BY u.created_at ASC LIMIT ${limit} OFFSET ${offset}`, [])
  const items = users.map((u) => AdminView.userRow(u, {
    projectCount: Number(u.project_count) || 0,
    tasksOpen: Number(u.tasks_open) || 0,
    tasksDone: Number(u.tasks_done) || 0,
    points: Number(u.points) || 0,
  }))
  return paginated(items, total, page, limit)
}

export async function deleteUser(actor: DbUser, targetId: string) {
  const target = await UserModel.findById(targetId)
  if (!target) fail(404, 'Utilisateur introuvable')
  if (target.id === actor.id) fail(400, 'Vous ne pouvez pas supprimer votre propre compte')
  if (UserView.isSuperAdmin(target)) fail(400, 'Impossible de supprimer le super administrateur')
  if (UserView.isAdmin(target) && !UserView.isSuperAdmin(actor)) fail(403, 'Seul le super administrateur peut supprimer un admin')
  const owned = await many('SELECT id, name FROM projects WHERE owner_id=$1', [target.id])
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const pr of owned) {
      const members = await client.query('SELECT user_id FROM memberships WHERE project_id=$1', [pr.id])
      for (const mb of members.rows) {
        if (mb.user_id === target.id) continue
        await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)',
          [uid(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${pr.name} » a été supprimé par l’administrateur.`])
      }
      await deleteProjectCascade(client, pr.id)
    }
    await client.query('UPDATE tasks SET assignee_id=NULL WHERE assignee_id=$1', [target.id])
    await client.query('DELETE FROM poll_votes WHERE user_id=$1', [target.id])
    await client.query('DELETE FROM member_roles WHERE user_id=$1', [target.id])
    await client.query('DELETE FROM memberships WHERE user_id=$1', [target.id])
    await client.query('DELETE FROM notifications WHERE user_id=$1', [target.id])
    await client.query('DELETE FROM users WHERE id=$1', [target.id])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
  await audit(actor, 'delete_user', `${target.name} (${target.email})${owned.length ? ` + ${owned.length} projet(s)` : ''}`)
  return owned.length
}

export async function setUserAdmin(actor: DbUser, targetId: string, admin: boolean) {
  const target = await UserModel.findById(targetId)
  if (!target) fail(404, 'Utilisateur introuvable')
  if (UserView.isSuperAdmin(target)) fail(400, 'Le super administrateur est admin par défaut')
  await q('UPDATE users SET is_admin=$1 WHERE id=$2', [admin, target.id])
  await audit(actor, admin ? 'grant_admin' : 'revoke_admin', `${target.name} (${target.email})`)
  return admin
}

export async function listAudit(query: Record<string, unknown> = {}) {
  const { page, limit, offset } = parsePagination(query, { limit: 50 })
  const countRow = await one<{ c: number }>('SELECT count(*)::int AS c FROM admin_audit', [])
  const total = Number(countRow.c) || 0
  const rows = await many(
    `SELECT id,actor_name,action,detail,created_at FROM admin_audit
    ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, [])
  return paginated(rows, total, page, limit)
}

export async function listMail() {
  if (!env.mailOn) fail(503, 'Boîte mail non configurée (SMTP_PASS absent sur le serveur).')
  try {
    return { messages: await imapList(30), mailbox: env.SMTP_USER }
  } catch (e) {
    console.error('imap list', (e as Error).message)
    fail(502, 'Connexion à la boîte mail échouée : ' + (e as Error).message)
  }
}

export async function readMail(uid: string) {
  if (!env.mailOn) fail(503, 'Boîte mail non configurée.')
  try {
    const m = await imapRead(uid)
    if (!m) fail(404, 'Message introuvable')
    return m
  } catch (e) {
    if (e instanceof HttpError) throw e
    console.error('imap read', (e as Error).message)
    fail(502, 'Lecture du message échouée : ' + (e as Error).message)
  }
}

export async function sendMail(actor: DbUser, body: { to?: string; subject?: string; body?: string }) {
  const to = (body.to || '').trim()
  const subject = (body.subject || '').trim()
  const text = String(body.body || '')
  if (!to || !subject) fail(400, 'Destinataire et objet requis')
  try {
    await sendRaw({ to, subject, text })
    await audit(actor, 'mail_sent', `→ ${to} : ${subject}`)
  } catch (e) {
    fail(502, 'Envoi échoué : ' + (e as Error).message)
  }
}

export async function replyMail(actor: DbUser, uid: string, body: string) {
  const text = String(body || '')
  try {
    const orig = await imapRead(uid)
    if (!orig) fail(404, 'Message introuvable')
    const to = orig.replyTo || orig.from
    const subject = /^re\s*:/i.test(orig.subject) ? orig.subject : ('Re: ' + orig.subject)
    await sendRaw({ to, subject, text, inReplyTo: orig.messageId })
    await audit(actor, 'mail_reply', `→ ${to} : ${subject}`)
  } catch (e) {
    if (e instanceof HttpError) throw e
    fail(502, 'Réponse échouée : ' + (e as Error).message)
  }
}

export async function listTasks(query: Record<string, unknown> = {}) {
  const { page, limit, offset } = parsePagination(query, { limit: 50 })
  const countRow = await one<{ c: number }>('SELECT count(*)::int AS c FROM tasks', [])
  const total = Number(countRow.c) || 0
  const rows = await many(
    `SELECT t.*, p.name AS project_name, u.name AS assignee_name
    FROM tasks t JOIN projects p ON p.id=t.project_id
    LEFT JOIN users u ON u.id=t.assignee_id
    ORDER BY t.priority ASC, t.created_at ASC
    LIMIT ${limit} OFFSET ${offset}`, [])
  const items = rows.map((t) => AdminView.adminTask(t))
  return paginated(items, total, page, limit)
}

export async function setTaskPriority(actor: DbUser, taskId: string, priority: unknown) {
  const t = await TaskModel.findById(taskId)
  if (!t) fail(404, 'Tâche introuvable')
  const n = parseInt(String(priority), 10)
  if (!(n >= 1 && n <= 6)) fail(400, 'Priorité invalide (1 à 6)')
  await q('UPDATE tasks SET priority=$1 WHERE id=$2', [n, t.id])
  await audit(actor, 'task_priority', `« ${t.title} » → P${n}`)
  return n
}

export async function listProjects(query: Record<string, unknown> = {}) {
  const { page, limit, offset } = parsePagination(query, { limit: 30 })
  const countRow = await one<{ c: number }>('SELECT count(*)::int AS c FROM projects', [])
  const total = Number(countRow.c) || 0
  const rows = await many(
    `SELECT p.*, u.name AS owner_name, u.email AS owner_email,
    (SELECT count(*) FROM memberships m WHERE m.project_id=p.id)::int AS "memberCount",
    (SELECT count(*) FROM tasks t WHERE t.project_id=p.id)::int AS "taskCount",
    (SELECT count(*) FROM tasks t WHERE t.project_id=p.id AND t.done)::int AS "doneCount"
  FROM projects p LEFT JOIN users u ON u.id=p.owner_id
  ORDER BY p.created_at DESC
  LIMIT ${limit} OFFSET ${offset}`, [])
  const items = rows.map((p) => AdminView.adminProject(p))
  return paginated(items, total, page, limit)
}

export async function deleteProject(actor: DbUser, projectId: string) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const members = await ProjectModel.findMembers(p.id)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const mb of members) {
      if (mb.user_id === actor.id) continue
      await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)',
        [uid(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${p.name} » a été supprimé par l’administrateur. Vous n'en êtes plus membre.`])
    }
    await deleteProjectCascade(client, p.id)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
  await audit(actor, 'delete_project', `« ${p.name} »`)
}
