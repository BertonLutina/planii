import type { QueryResultRow } from 'pg'
import { one, many } from '../db/pool'
import { REOPEN_DAYS } from '../lib/constants'

export type DbProject = QueryResultRow & {
  id: string
  name: string
  type: string
  owner_id: string
  status: string
  deadline?: string | null
  label_id?: string | null
  done_at?: string | null
}

export const findById = (id: string) => one<DbProject>('SELECT * FROM projects WHERE id=$1', [id])
export const findMembership = (projectId: string, userId: string) =>
  one('SELECT * FROM memberships WHERE project_id=$1 AND user_id=$2', [projectId, userId])
export const findMembers = (projectId: string) =>
  many<{ user_id: string; role: string }>('SELECT user_id, role FROM memberships WHERE project_id=$1', [projectId])

export const isClosed = (p: DbProject | null) => !!p && p.status === 'done'

export const reopenUntil = (p: DbProject | null) =>
  p?.done_at ? new Date(new Date(p.done_at).getTime() + REOPEN_DAYS * 864e5) : null

export const canReopen = (p: DbProject | null) => {
  const until = reopenUntil(p)
  return isClosed(p) && !!until && until >= new Date()
}

export const canManageRole = (role: string) => role === 'owner' || role === 'lead'
