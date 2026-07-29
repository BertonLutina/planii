export const DEFAULT_TASK_TYPES = ['Tâche', 'Bug']
export const PROJECT_LABEL_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']
export const DEFAULT_PROJECT_LABELS = [
  { label: 'Travail', color: '#3b82f6', position: 0, fixed: true },
  { label: 'Privé', color: '#ef4444', position: 1, fixed: true },
]
export const FIXED_TASK_STATUSES = [
  { key: 'todo', label: 'À faire', color: '#9a988f', position: 0, fixed: true },
  { key: 'in_progress', label: 'En cours', color: '#3b82d6', position: 1, fixed: true },
  { key: 'review', label: 'Revu', color: '#9b5de5', position: 2, fixed: true },
  { key: 'done', label: 'Terminé', color: '#4caf50', position: 99, fixed: true },
]
export const DEFAULT_CUSTOM_TASK_STATUSES = [
  { key: 'transferred', label: 'Transféré', color: '#f59f30', position: 3, fixed: false },
]
export const CREATOR_ROLE: Record<string, string> = { solo: 'owner', team: 'lead', group: 'owner' }
export const REOPEN_DAYS = 30

/** Clés des e-mails transactionnels (préférences utilisateur). */
export const EMAIL_NOTIF_KEYS = [
  'tAssign', 'tAssignMgr', 'tNew', 'tStatus', 'tTransferReceived', 'tTransferConfirmed', 'remind', 'late', 'lateMgr', 'relance',
  'apptNew', 'apptUpd',
  'invNew', 'invNewAdmin', 'welcome', 'joined',
] as const
export type EmailNotifKey = (typeof EMAIL_NOTIF_KEYS)[number]
export const DEFAULT_EMAIL_NOTIFS: Record<EmailNotifKey, boolean> = Object.fromEntries(
  EMAIL_NOTIF_KEYS.map((k) => [k, true]),
) as Record<EmailNotifKey, boolean>
