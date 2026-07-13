import fs from 'fs'
import path from 'path'
import { pool } from './pool'
import { logger } from '../logger'

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations')

export async function runMigrations() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`)

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const id = file.replace(/\.sql$/, '')
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE id=$1', [id])
    if (applied.rowCount) continue

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id])
      await client.query('COMMIT')
      logger.info({ migration: id }, 'Migration appliquée')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => { logger.info('Migrations terminées'); return pool.end() })
    .catch((e) => { logger.error(e); process.exit(1) })
}
