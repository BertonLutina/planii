// Variables d'environnement AVANT tout import src (env.ts lit process.env au chargement)
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/planii_test'
process.env.SMTP_PASS = ''

import { beforeAll } from 'vitest'
import { runMigrations } from '../src/db/migrate'
import { pool } from '../src/db/pool'

export let dbAvailable = false

beforeAll(async () => {
  try {
    await runMigrations()
    dbAvailable = true
  } catch {
    dbAvailable = false
  }
}, 60_000)

export async function resetDb() {
  if (!dbAvailable) return
  await pool.query(`TRUNCATE
    poll_votes, poll_options, polls, task_reminders, task_events, task_comments,
    task_transfers, meeting_messages, notifications, activity, invites,
    member_roles, project_roles, task_statuses, tasks, memberships, projects,
    project_labels, admin_audit, users
    RESTART IDENTITY CASCADE`)
}
