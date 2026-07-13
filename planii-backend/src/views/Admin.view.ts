import type { DbUser } from '../models/User.model'
import * as UserView from './User.view'

export const pointsForTask = (due: string | null, doneDay: string | null) => {
  if (!due) return 10
  if (!doneDay) return 15
  if (doneDay < due) return 20
  if (doneDay === due) return 15
  return 5
}

export const anonProject = (id: string) => `Projet #${String(id || '').slice(0, 6).toUpperCase()}`
export const anonTask = () => 'Tâche anonymisée'
export const anonUser = (id: string) => `Utilisateur #${String(id || '').slice(0, 6).toUpperCase()}`

export const maskEmail = (email: string) => {
  const [name, domain] = String(email || '').split('@')
  if (!domain) return '[masqué]'
  return `${name.slice(0, 1)}***@${domain}`
}

export const stats = (data: Record<string, unknown>) => ({ stats: data })

export const users = (items: unknown[]) => ({ users: items })

export const userRow = (
  u: Record<string, unknown>,
  extra: { projectCount: number; tasksOpen: number; tasksDone: number; points: number },
) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  firstName: u.first_name || '',
  lastName: u.last_name || '',
  createdAt: u.created_at,
  lastLogin: u.last_login,
  admin: UserView.isAdmin(u as DbUser),
  superAdmin: UserView.isSuperAdmin(u as DbUser),
  projectCount: extra.projectCount,
  tasksOpen: extra.tasksOpen,
  tasksDone: extra.tasksDone,
  points: extra.points,
})

export const auditLog = (rows: unknown[]) => ({
  audit: (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id,
    actor: row.actor_name,
    action: row.action,
    detail: row.detail,
    at: row.created_at,
  })),
})

export const mailList = (messages: unknown[], mailbox: string) => ({ messages, mailbox })

export const mailMessage = (message: unknown) => ({ message })

export const tasks = (items: unknown[]) => ({ tasks: items })

export const adminTask = (t: Record<string, unknown>) => ({
  id: t.id,
  title: anonTask(),
  projectId: t.project_id,
  projectName: anonProject(String(t.project_id)),
  assigneeName: t.assignee_id ? anonUser(String(t.assignee_id)) : null,
  due: t.due,
  done: t.done,
  priority: t.priority == null ? 6 : Number(t.priority),
})

export const projects = (items: unknown[]) => ({ projects: items })

export const paginated = <T>(result: import('../lib/pagination').PaginatedResult<T>) => result

export const adminProject = (p: Record<string, unknown>) => ({
  id: p.id,
  name: anonProject(String(p.id)),
  type: p.type,
  status: p.status,
  deadline: p.deadline,
  ownerName: p.owner_id ? anonUser(String(p.owner_id)) : '—',
  ownerEmail: maskEmail(String(p.owner_email || '')),
  memberCount: p.memberCount,
  taskCount: p.taskCount,
  doneCount: p.doneCount,
  createdAt: p.created_at,
})
