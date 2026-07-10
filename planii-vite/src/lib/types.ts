export type Role = 'owner' | 'lead' | 'provider' | 'client' | 'member'
export type ProjectType = 'solo' | 'team' | 'group'

export interface User { id: string; name: string; email: string; firstName?: string; lastName?: string; job?: string; taskTypes?: string[]; roleLibrary?: string[]; admin?: boolean; superAdmin?: boolean }

export interface ProjectRole { id: string; name: string }
export interface ProjectLabel { id: string; label: string; color: string; position: number; fixed: boolean }
export interface TaskStatus { id: string; key: string; label: string; color: string; position: number; fixed: boolean }

export interface Member { id: string; name: string; email: string; role: Role; job?: string; roleIds?: string[] }

export interface Task {
  id: string
  title: string
  description?: string | null
  type?: string | null
  parentId?: string | null
  assigneeId: string | null
  createdBy: string
  due: string | null
  done: boolean
  doneAt?: string | null
  estHours?: number | null
  spentHours?: number | null
  priority?: number | null
  position?: number | null
  statusKey?: string | null
  transferredFrom?: string | null
  transferredTo?: string | null
}

export interface PollOption { id: string; label: string; votes: number }
export interface Poll {
  id: string
  question: string
  closed: boolean
  createdBy: string
  options: PollOption[]
  myVote: string | null
}

export interface Activity { id: string; type: string; detail: string; user: string | null; at: string }

export interface ProjectSummary {
  id: string
  name: string
  type: ProjectType
  status: string
  deadline: string | null
  owner_id: string
  my_role: Role
  memberCount: number
  labelId?: string | null
  labelName?: string | null
  labelColor?: string | null
  taskCount: number
  doneCount: number
  position?: number | null
}

export interface Notification {
  id: string
  type: string
  title: string
  detail: string
  read: boolean
  at: string
}

export interface Project extends ProjectSummary {
  members: Member[]
  tasks: Task[]
  polls: Poll[]
  activity: Activity[]
  roles: ProjectRole[]
  statuses: TaskStatus[]
}

export interface InviteInfo {
  project: { id: string; name: string; type: ProjectType }
  role: Role
  invitedBy: string | null
  token?: string
}

export interface CalEvent {
  id: string
  date: Date
  title: string
  done?: boolean
  over?: boolean
  deadline?: boolean
  pid: string
  pname?: string
}
