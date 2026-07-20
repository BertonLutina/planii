import type { QueryResultRow } from 'pg'
import { one, many, q } from '../db/pool'

export type DbUser = QueryResultRow & {
  id: string
  name: string
  email: string
  pass_hash: string
  first_name?: string | null
  last_name?: string | null
  is_admin?: boolean
  job?: string | null
  task_types?: string[] | null
  role_library?: string[] | null
  project_label_colors?: string[] | null
  lang?: string | null
}

export const findByEmail = (email: string) => one<DbUser>('SELECT * FROM users WHERE email=$1', [email])
export const findById = (id: string) => one<DbUser>('SELECT * FROM users WHERE id=$1', [id])

export async function createUser(data: {
  id: string
  name: string
  email: string
  pass_hash: string
  job?: string | null
}) {
  await q(
    'INSERT INTO users (id,name,email,pass_hash,job) VALUES ($1,$2,$3,$4,$5)',
    [data.id, data.name, data.email, data.pass_hash, data.job ?? null],
  )
}

export async function updateUser(
  id: string,
  data: {
    first_name?: string | null
    last_name?: string | null
    name: string
    job?: string | null
    task_types?: string
    role_library?: string
    project_label_colors?: string
    lang?: string
  },
) {
  if ('project_label_colors' in data) {
    await q('UPDATE users SET project_label_colors=$1 WHERE id=$2', [data.project_label_colors, id])
    return
  }
  await q(
    'UPDATE users SET first_name=$1, last_name=$2, name=$3, job=$4, task_types=$5, role_library=$6, lang=coalesce($7, lang) WHERE id=$8',
    [data.first_name ?? null, data.last_name ?? null, data.name, data.job ?? null, data.task_types, data.role_library, data.lang ?? null, id],
  )
}

export const touchLastLogin = (id: string) => q('UPDATE users SET last_login=now() WHERE id=$1', [id])

export const projectManagers = (projectId: string) => many(
  `SELECT DISTINCT u.id, u.name, u.email, u.lang, m.role
    FROM memberships m JOIN users u ON u.id=m.user_id
    WHERE m.project_id=$1 AND m.role IN ('owner','lead')`,
  [projectId],
)
