import { t } from '@/lib/i18n'
import type { Project, Task, TaskStatus } from '@/lib/types'
import type { Colors } from '@/theme/tokens'

/** Clé de statut effective d'une tâche (même repli que le web). */
export const statusOf = (task: Task): string => task.statusKey || (task.done ? 'done' : 'todo')

/** Statuts du projet, triés par position. Le web code en dur cinq statuts de
 *  repli avec des hex ; ici le repli passe par les jetons du thème pour rester
 *  lisible en clair comme en sombre. Les couleurs venues du serveur sont, elles,
 *  des données de contenu et sont conservées telles quelles. */
export function statusesOf(p: Project, c: Colors): TaskStatus[] {
  const base: TaskStatus[] = p.statuses && p.statuses.length
    ? p.statuses
    : [
      { id: 'todo', key: 'todo', label: t('term.todo'), color: c.muted, position: 0, fixed: true },
      { id: 'in_progress', key: 'in_progress', label: t('term.doing'), color: c.blue, position: 1, fixed: true },
      { id: 'review', key: 'review', label: t('term.reviewSt'), color: c.accent, position: 2, fixed: true },
      { id: 'transferred', key: 'transferred', label: t('term.transferredSt'), color: c.warn, position: 3, fixed: false },
      { id: 'done', key: 'done', label: t('term.doneSt'), color: c.ok, position: 99, fixed: true },
    ]
  return base.slice().sort((a, b) => a.position - b.position)
}

export const findStatus = (list: TaskStatus[], key: string): TaskStatus | undefined =>
  list.find((s) => s.key === key)
