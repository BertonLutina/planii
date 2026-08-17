import { canManage, isOverdue } from '@/lib/dates'
import type { Member, Project, Task, User } from '@/lib/types'

/** Droits d'une tâche — copie fidèle des gardes de `ProjectDetail.renderTask`.
 *  Un projet clôturé (`pd.closedRO`) neutralise toutes les actions d'écriture. */
export interface TaskPerms {
  over: boolean
  mine: boolean
  unassigned: boolean
  closed: boolean
  manage: boolean
  assignee: Member | undefined
  /** Cocher / décocher : seul le responsable, projet ouvert. */
  canCheck: boolean
  canEditMeta: boolean
  canLogHours: boolean
  canDel: boolean
  canPrio: boolean
  canMove: boolean
  canTransfer: boolean
  canClaim: boolean
  canRelance: boolean
  canSub: boolean
}

export function taskPerms(t: Task, p: Project, me: User, isSub = false): TaskPerms {
  const closed = p.status === 'done'
  const manage = canManage(p.my_role)
  const mine = t.assigneeId === me.id
  const unassigned = !t.assigneeId
  const assignee = p.members.find((m) => m.id === t.assigneeId)
  const over = isOverdue(t)
  const canEditMeta = !closed && (t.createdBy === me.id || manage)
  const canLogHours = !closed && (mine || manage)
  const canMove = !closed && (mine || t.createdBy === me.id || manage)
  return {
    over,
    mine,
    unassigned,
    closed,
    manage,
    assignee,
    canCheck: mine && !closed,
    canEditMeta,
    canLogHours,
    canDel: !closed && (t.createdBy === me.id || manage),
    canPrio: !closed && (mine || canEditMeta),
    canMove,
    canTransfer: canMove && t.transferable === true && p.members.some((m) => m.id !== (t.assigneeId || me.id)),
    canClaim: unassigned && !closed,
    canRelance: !closed && over && !mine && !unassigned && !!assignee?.email && (manage || t.createdBy === me.id),
    canSub: !isSub && !closed,
  }
}
