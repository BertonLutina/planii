/* Formes de réponse de `/admin/*`.
 * Relevées sur le backend (`planii-backend/src/views/Admin.view.ts` et
 * `services/admin.service.ts`), pas sur le code web : deux écarts comptent.
 *   — `adminTask` / `adminProject` anonymisent côté serveur (titre « Tâche
 *     anonymisée », nom « Projet #A1B2C3 », responsable « Utilisateur #… »,
 *     e-mail masqué). Les listes Tâches et Projets n'affichent donc jamais de
 *     donnée client, et la recherche porte de fait sur le code du projet.
 *   — `adminProject` renvoie aussi `deadline` et `createdAt`, que le web ignore.
 *     La feuille de détail les montre.
 * `GET /admin/audit` répond `{ …pagination, items, audit }` : `items` porte les
 * lignes brutes de la base (`actor_name`, `created_at`), `audit` la forme
 * lisible. On lit `audit`. */

export interface AStats {
  users: number
  projects: number
  projectsActive: number
  tasks: number
  tasksDone: number
  tasksOpen: number
  tasksOverdue: number
  completion: number
  activeUsers7: number
  tasksByPriority: { p: number; c: number }[]
  projectsByType: { t: string; c: number }[]
  doneByDay: { d: string; c: number }[]
  recentLogins: { name: string; email: string; lastLogin: string | null }[]
}

export interface AUser {
  id: string
  name: string
  email: string
  firstName?: string
  lastName?: string
  createdAt: string
  lastLogin?: string | null
  admin: boolean
  superAdmin: boolean
  projectCount: number
  tasksOpen: number
  tasksDone: number
  points: number
}

export interface ATask {
  id: string
  title: string
  projectId: string
  projectName: string
  assigneeName: string | null
  due: string | null
  done: boolean
  priority: number
}

export interface AProject {
  id: string
  name: string
  type: string
  status: string
  deadline?: string | null
  ownerName: string
  ownerEmail: string
  memberCount: number
  taskCount: number
  doneCount: number
  createdAt?: string | null
}

export interface AAudit {
  id: string
  actor: string
  action: string
  detail: string
  at: string
}

export interface MailItem {
  uid: number
  from: string
  fromName: string
  subject: string
  date?: string | null
  seen: boolean
}

export interface MailMsg {
  uid: number
  from: string
  to: string
  subject: string
  date?: string | null
  text: string
  /** `mailparser` renvoie `false` quand il n'y a pas de partie HTML. */
  html: string | false
  messageId?: string
  replyTo: string
}
