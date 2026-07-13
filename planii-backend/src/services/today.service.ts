import { many } from '../db/pool'
import * as TodayView from '../views/Today.view'

export async function getToday(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const rows = await many(
    `SELECT t.*, p.name AS project_name, p.status AS project_status,
      au.name AS assignee_name, fu.name AS transferred_from_name, tu.name AS transferred_to_name
    FROM tasks t
    JOIN projects p ON p.id=t.project_id
    JOIN memberships m ON m.project_id=p.id AND m.user_id=$1
    LEFT JOIN users au ON au.id=t.assignee_id
    LEFT JOIN users fu ON fu.id=t.transferred_from
    LEFT JOIN users tu ON tu.id=t.transferred_to
    WHERE p.status <> 'done'
    ORDER BY t.priority ASC, t.due ASC NULLS LAST, t.created_at ASC`, [userId])
  const card = (t: Record<string, unknown>) => TodayView.card(t)
  const open = rows.filter((t) => !t.done)
  const mine = open.filter((t) => t.assignee_id === userId)
  const activeDiscussions = await many(
    `SELECT p.id, p.name, max(mm.created_at) AS last_message_at, count(mm.id)::int AS count
    FROM meeting_messages mm
    JOIN projects p ON p.id=mm.project_id
    JOIN memberships m ON m.project_id=p.id AND m.user_id=$1
    WHERE p.status <> 'done' AND mm.created_at > now() - interval '7 days'
    GROUP BY p.id, p.name
    ORDER BY last_message_at DESC LIMIT 8`, [userId])
  return {
    dueToday: mine.filter((t) => t.due === today).map(card),
    overdue: mine.filter((t) => t.due && t.due < today).map(card),
    highPriority: mine.filter((t) => Number(t.priority || 6) <= 2).slice(0, 12).map(card),
    transferred: open.filter((t) => t.transferred_from === userId || t.transferred_to === userId).slice(0, 12).map(card),
    review: mine.filter((t) => (t.status_key || '') === 'review').map(card),
    activeDiscussions: activeDiscussions.map((r) => TodayView.discussion(r)),
  }
}
