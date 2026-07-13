import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { env } from '../config/env'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.pgSsl ? { rejectUnauthorized: false } : undefined,
})

export const q = (text: string, params?: unknown[]) => pool.query(text, params)

export const one = async <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
  (await pool.query<T>(text, params)).rows[0] || null

export const many = async <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
  (await pool.query<T>(text, params)).rows

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
