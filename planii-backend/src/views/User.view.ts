import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { DEFAULT_TASK_TYPES, DEFAULT_EMAIL_NOTIFS, EMAIL_NOTIF_KEYS, PROJECT_LABEL_COLORS, type EmailNotifKey } from '../lib/constants'
import { cleanLabels, cleanColor } from '../lib/utils'
import type { DbUser } from '../models/User.model'

export const isSuperAdmin = (u: DbUser) => env.superAdminEmails.includes((u.email || '').toLowerCase())
export const isAdmin = (u: DbUser) => isSuperAdmin(u) || u.is_admin === true

export const taskTypesOf = (u: DbUser) =>
  (u && Array.isArray(u.task_types) && u.task_types.length) ? u.task_types : DEFAULT_TASK_TYPES

export const roleLibraryOf = (u: DbUser) =>
  (u && Array.isArray(u.role_library)) ? u.role_library : []

export const projectLabelColorsOf = (u: DbUser) => {
  const custom = Array.isArray(u?.project_label_colors)
    ? u.project_label_colors.map((c) => cleanColor(c, '')).filter(Boolean)
    : []
  return cleanLabels([...PROJECT_LABEL_COLORS, ...custom], 7, 40)
}

export const emailNotifsOf = (u: DbUser | null | undefined): Record<EmailNotifKey, boolean> => {
  const raw = u?.email_notifs && typeof u.email_notifs === 'object' && !Array.isArray(u.email_notifs)
    ? u.email_notifs as Record<string, unknown>
    : {}
  const out = { ...DEFAULT_EMAIL_NOTIFS }
  for (const key of EMAIL_NOTIF_KEYS) {
    if (key in raw) out[key] = raw[key] !== false
  }
  return out
}

export const toPublic = (u: DbUser | null) => u && {
  id: u.id,
  name: u.name,
  email: u.email,
  firstName: u.first_name || '',
  lastName: u.last_name || '',
  job: u.job || '',
  avatarUrl: u.avatar_url || null,
  taskTypes: taskTypesOf(u),
  roleLibrary: roleLibraryOf(u),
  emailNotifs: emailNotifsOf(u),
  admin: isAdmin(u),
  superAdmin: isSuperAdmin(u),
}

export const signToken = (u: DbUser) => jwt.sign({ sub: u.id }, env.JWT_SECRET, { expiresIn: '30d' })

export const authSession = (token: string, user: DbUser | null) => ({
  token,
  user: toPublic(user),
})
