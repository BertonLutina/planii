import { prio } from './priority'
import type { Task, ProjectSummary } from './types'

export type Dir = 'asc' | 'desc'
export type TaskSort = 'priority' | 'due' | 'title' | 'manual'
export type ProjSort = 'title' | 'manual'

const pos = (x: { position?: number | null }) => (x.position == null ? 1e9 : x.position)
const byName = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' })

/** Classement de base d'une tâche : priorité (P1 en tête) → échéance → titre. */
export function taskRank(a: Task, b: Task): number {
  const pa = prio(a.priority), pb = prio(b.priority)
  if (pa !== pb) return pa - pb
  const dc = (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99')
  if (dc) return dc
  return byName(a.title, b.title)
}

/** Comparateur de tâches selon le mode + sens. Les tâches terminées restent en bas. */
export function taskComparator(mode: TaskSort, dir: Dir) {
  const s = dir === 'asc' ? 1 : -1
  return (a: Task, b: Task): number => {
    const done = (a.done ? 1 : 0) - (b.done ? 1 : 0)
    if (done) return done
    let base: number
    if (mode === 'manual') base = pos(a) - pos(b) || taskRank(a, b)
    else if (mode === 'due') base = (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99') || taskRank(a, b)
    else if (mode === 'title') base = byName(a.title, b.title)
    else base = taskRank(a, b)
    return s * base
  }
}

/** Comparateur de projets selon le mode + sens. */
export function projectComparator(mode: ProjSort, dir: Dir) {
  const s = dir === 'asc' ? 1 : -1
  return (a: ProjectSummary, b: ProjectSummary): number => {
    const base = mode === 'manual' ? (pos(a) - pos(b) || byName(a.name, b.name)) : byName(a.name, b.name)
    return s * base
  }
}
