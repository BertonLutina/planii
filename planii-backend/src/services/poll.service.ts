import { q, one, many } from '../db/pool'
import { uid } from '../lib/utils'
import { fail } from '../core/http-error'
import * as ProjectModel from '../models/Project.model'
import { parsePagination, paginated } from '../lib/pagination'
import * as ProjectView from '../views/Project.view'
import { assertProjectOpen } from './project.service'
import { logActivity, bump } from './notification.service'

export async function createPoll(projectId: string, userId: string, body: { question?: string; options?: string[] }) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, userId)
  if (!m) fail(403, 'Non membre')
  assertProjectOpen(p)
  const question = (body.question || '').trim()
  const options = (body.options || []).map((o) => (o || '').trim()).filter(Boolean)
  if (!question || options.length < 2) fail(400, 'Question et au moins 2 options requises')
  const pollId = uid()
  await q('INSERT INTO polls (id,project_id,question,created_by) VALUES ($1,$2,$3,$4)', [pollId, p.id, question, userId])
  for (const label of options) await q('INSERT INTO poll_options (id,poll_id,label) VALUES ($1,$2,$3)', [uid(), pollId, label])
  await logActivity(p.id, userId, 'poll_created', `a lancé un sondage : « ${question} »`)
  return pollId
}

export async function vote(pollId: string, userId: string, optionId: string) {
  const poll = await one('SELECT * FROM polls WHERE id=$1', [pollId])
  if (!poll) fail(404, 'Sondage introuvable')
  const m = await ProjectModel.findMembership(poll.project_id, userId)
  if (!m) fail(403, 'Non membre')
  const p = await ProjectModel.findById(poll.project_id)
  assertProjectOpen(p)
  const opt = await one('SELECT * FROM poll_options WHERE poll_id=$1 AND id=$2', [poll.id, optionId])
  if (!opt) fail(400, 'Option invalide')
  await q(`INSERT INTO poll_votes (poll_id,option_id,user_id) VALUES ($1,$2,$3)
    ON CONFLICT (poll_id,user_id) DO UPDATE SET option_id=excluded.option_id`, [poll.id, opt.id, userId])
  bump(poll.project_id)
}

export async function listActivity(projectId: string, userId: string, query: Record<string, unknown> = {}) {
  const m = await ProjectModel.findMembership(projectId, userId)
  if (!m) fail(403, 'Non membre')
  const { page, limit, offset } = parsePagination(query, { limit: 30 })
  const countRow = await one<{ c: number }>(
    'SELECT count(*)::int AS c FROM activity WHERE project_id=$1', [projectId])
  const total = Number(countRow.c) || 0
  const rows = await many(
    `SELECT a.*, u.name AS user_name FROM activity a
    LEFT JOIN users u ON u.id=a.user_id WHERE a.project_id=$1
    ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`, [projectId])
  const items = rows.map((a) => ProjectView.activityItem(a))
  return paginated(items, total, page, limit)
}
