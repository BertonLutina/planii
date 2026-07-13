import type { DbProject } from '../models/Project.model'

export const listItem = (row: Record<string, unknown>) => ({
  ...row,
  my_role: row.my_role,
  memberCount: row.memberCount,
  taskCount: row.taskCount,
  doneCount: row.doneCount,
})

export const created = (p: Record<string, unknown>, role: string) => ({
  project: { ...p, my_role: role, memberCount: 1, taskCount: 0, doneCount: 0 },
})

export const detail = (project: Record<string, unknown>, myRole: string) => ({
  project: { ...project, my_role: myRole },
})

export const single = (p: DbProject | Record<string, unknown> | null) => ({ project: p })

export const roleCreated = (id: string, name: string) => ({ role: { id, name } })

export const statuses = (items: unknown[]) => ({ statuses: items })

export const memberRoles = (ids: string[]) => ({ ok: true, roleIds: ids })

export const activity = (items: unknown[]) => ({ activity: items })

export const activityPaginated = <T>(result: import('../lib/pagination').PaginatedResult<T>) => ({
  ...result,
  activity: result.items,
})

import type { PaginatedResult } from '../lib/pagination'

export const paginatedTasks = <T>(result: PaginatedResult<T>) => result

export const activityItem = (a: Record<string, unknown>) => ({
  id: a.id,
  type: a.type,
  detail: a.detail,
  user: a.user_name,
  at: a.created_at,
})
