import { q, one, many } from '../db/pool'
import { parisHour, parisDate } from '../lib/utils'
import * as UserModel from '../models/User.model'
import { sendMail } from './mail.service'
import { notify } from './notification.service'
import { logger } from '../logger'
import { env } from '../config/env'

export async function runDeadlineReminders() {
  const tomorrow = parisDate(1)
  const today = parisDate(0)
  const tasks = await many(
    `SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.name AS project_name, u.email AS email
      FROM tasks t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due=$1 AND t.assignee_id IS NOT NULL`, [tomorrow])
  let sent = 0
  for (const t of tasks) {
    const already = await one('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, tomorrow])
    if (already) continue
    await q('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, tomorrow])
    await sendMail(t.email, `Rappel : « ${t.title} » à rendre demain`, {
      intro: `La tâche « ${t.title} » du projet « ${t.project_name} » arrive à échéance demain.`,
      rows: [['Projet', t.project_name], ['Échéance', t.due], ['Priorité', 'P' + (t.priority || 6)]],
      ctaText: 'Ouvrir Planii',
      ctaUrl: env.webUrl,
    })
    await notify(t.assignee_id, 'deadline', `Échéance demain : ${t.title}`, `Projet « ${t.project_name} »`)
    sent++
  }
  const overdue = await many(
    `SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.id AS project_id, p.name AS project_name,
        u.name AS assignee_name, u.email AS assignee_email
      FROM tasks t
      JOIN projects p ON p.id=t.project_id
      JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due IS NOT NULL AND t.due < $1 AND t.assignee_id IS NOT NULL`, [today])
  for (const t of overdue) {
    const markDate = today
    const already = await one('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, markDate])
    if (already) continue
    await q('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, markDate])
    const rows: ([string, string] | null)[] = [
      ['Projet', t.project_name],
      ['Tâche', t.title],
      ['Responsable', t.assignee_name],
      ['Échéance', t.due],
      ['Priorité', 'P' + (t.priority || 6)],
    ]
    await sendMail(t.assignee_email, `En retard : « ${t.title} »`, {
      intro: `Vous êtes en retard sur la tâche « ${t.title} » du projet « ${t.project_name} ».`,
      rows,
      ctaText: 'Ouvrir Planii',
      ctaUrl: env.webUrl,
    })
    await notify(t.assignee_id, 'task_overdue', `Tâche en retard : ${t.title}`, `Projet « ${t.project_name} »`)
    for (const manager of await UserModel.projectManagers(t.project_id)) {
      if (!manager.email || manager.id === t.assignee_id) continue
      await sendMail(manager.email, `Retard dans « ${t.project_name} »`, {
        intro: `${t.assignee_name} est en retard sur la tâche « ${t.title} ».`,
        rows,
        ctaText: 'Ouvrir Planii',
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
