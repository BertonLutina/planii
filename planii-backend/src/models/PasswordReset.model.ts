import type { QueryResultRow } from 'pg'
import { one, q } from '../db/pool'

export type DbResetToken = QueryResultRow & {
  id: string
  user_id: string
  token_hash: string
  expires_at: Date
  used_at: Date | null
}

export const insert = (id: string, userId: string, tokenHash: string, expiresAt: Date) =>
  q(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)',
    [id, userId, tokenHash, expiresAt],
  )

export const invalidateOpen = (userId: string) =>
  q(
    'UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',
    [userId],
  )

export const findValid = (tokenHash: string) =>
  one<DbResetToken>(
    `SELECT * FROM password_reset_tokens
      WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash],
  )

export const markUsed = (id: string) =>
  q('UPDATE password_reset_tokens SET used_at=now() WHERE id=$1', [id])
