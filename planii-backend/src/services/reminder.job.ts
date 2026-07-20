import { q, one, many } from '../db/pool'
import { parisHour, parisDate } from '../lib/utils'
import * as UserModel from '../models/User.model'
import { mt } from '../lib/mail-i18n'
import { sendMail } from './mail.service'
import { notify } from './notification.service'
import { logger } from '../logger'
import { env } from '../config/env'

export async function runDeadlineReminders() {
  const tomorrow = parisDate(1)
  const today = parisDate(0)
  const tasks = await many(
    `SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.name AS project_name, u.email AS email, u.lang AS lang
      FROM tasks t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due=$1 AND t.assignee_id IS NOT NULL`, [tomorrow])
  let sent = 0
  for (const t of tasks) {
    const already = await one('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, tomorrow])
    if (already) continue
    await q('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, tomorrow])
    await sendMail(t.email, mt(t.lang, 'remind.s', { title: t.title }), {
      intro: mt(t.lang, 'remind.i', { title: t.title, project: t.project_name }),
      rows: [[mt(t.lang, 'r.project'), t.project_name], [mt(t.lang, 'r.due'), t.due], [mt(t.lang, 'r.priority'), 'P' + (t.priority || 6)]],
      ctaText: mt(t.lang, 'cta'),
      ctaUrl: env.webUrl,
    })
    await notify(t.assignee_id, 'deadline', `Échéance demain : ${t.title}`, `Projet « ${t.project_name} »`)
    sent++
  }
  const overdue = await many(
    `SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.id AS project_id, p.name AS project_name,
        u.name AS assignee_name, u.email AS assignee_email, u.lang AS assignee_lang
      FROM tasks t
      JOIN projects p ON p.id=t.project_id
      JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due IS NOT NULL AND t.due < $1 AND t.assignee_id IS NOT NULL`, [today])
  for (const t of overdue) {
    const markDate = today
    const already = await one('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, markDate])
    if (already) continue
    await q('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, markDate])
    const rowsFor = (l?: string | null): ([string, string] | null)[] => [
      [mt(l, 'r.project'), t.project_name],
      [mt(l, 'r.task'), t.title],
      [mt(l, 'r.assignee'), t.assignee_name],
      [mt(l, 'r.due'), t.due],
      [mt(l, 'r.priority'), 'P' + (t.priority || 6)],
    ]
    await sendMail(t.assignee_email, mt(t.assignee_lang, 'late.s', { title: t.title }), {
      intro: mt(t.assignee_lang, 'late.i', { title: t.title, project: t.project_name }),
      rows: rowsFor(t.assignee_lang),
      ctaText: mt(t.assignee_lang, 'cta'),
      ctaUrl: env.webUrl,
    })
    await notify(t.assignee_id, 'task_overdue', `Tâche en retard : ${t.title}`, `Projet « ${t.project_name} »`)
    for (const manager of await UserModel.projectManagers(t.project_id)) {
      if (!manager.email || manager.id === t.assignee_id) continue
      await sendMail(manager.email, mt(manager.lang, 'lateMgr.s', { project: t.project_name }), {
        intro: mt(manager.lang, 'lateMgr.i', { assignee: t.assignee_name, title: t.title }),
        rows: rowsFor(manager.lang),
        ctaText: mt(manager.lang, 'cta'),
        ctaUrl: env.webUrl,
      })
    }
    sent++
  }
  return sent
}

let lastReminderDay: string | null = null

export function startReminderScheduler() {
  setInterval(async () => {
    try {
      const today = parisDate(0)
      if (parisHour() >= 18 && lastReminderDay !== today) {
        lastReminderDay = today
        const n = await runDeadlineReminders()
        if (n) logger.info(`Rappels d'échéance envoyés : ${n} (${today})`)
      }
    } catch (e) {
      logger.error({ err: e }, 'scheduler')
    }
  }, 5 * 60 * 1000)
}
