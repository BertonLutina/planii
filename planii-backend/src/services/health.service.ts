import { q } from '../db/pool'

export async function check() {
  await q('SELECT 1')
  return { ok: true, name: 'planii-backend', db: 'postgres' }
}
