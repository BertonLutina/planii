import { q } from '../db/pool'
import { uid } from '../lib/utils'
import { logger } from '../logger'
import type { DbUser } from '../models/User.model'

export async function audit(actor: DbUser, action: string, detail?: string) {
  try {
    await q('INSERT INTO admin_audit (id,actor_id,actor_name,action,detail) VALUES ($1,$2,$3,$4,$5)',
      [uid(), actor.id, actor.name, action, detail || ''])
  } catch (e) {
    logger.error({ err: e }, 'audit')
  }
}
