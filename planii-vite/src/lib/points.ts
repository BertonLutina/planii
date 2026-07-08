import type { Project, Task } from './types'

/**
 * Barème :
 *  - terminée EN AVANCE (avant l'échéance) : 20 pts
 *  - terminée LE JOUR MÊME                 : 15 pts
 *  - terminée EN RETARD                    :  5 pts (au moins quelque chose)
 *  - sans date d'échéance                  : 10 pts (neutre)
 */
export const PTS_EARLY = 20
export const PTS_ONTIME = 15
export const PTS_LATE = 5
export const PTS_NODATE = 10

/** Points selon la date d'échéance (due) et le jour où c'est terminé (doneDay). */
export function pointsFor(due?: string | null, doneDay?: string | null): number {
  if (!due) return PTS_NODATE
  if (!doneDay) return PTS_ONTIME // terminée mais date inconnue → on-time par défaut
  if (doneDay < due) return PTS_EARLY
  if (doneDay === due) return PTS_ONTIME
  return PTS_LATE
}

/** Points d'une tâche terminée (0 si non terminée). */
export function taskPoints(t: Task): number {
  if (!t.done) return 0
  const doneDay = t.doneAt ? String(t.doneAt).slice(0, 10) : null
  return pointsFor(t.due, doneDay)
}

/** Total des points d'un membre dans un projet (ses tâches terminées). */
export function memberPoints(p: Project, memberId: string): number {
  return p.tasks.filter((t) => t.assigneeId === memberId).reduce((s, t) => s + taskPoints(t), 0)
}

/** Total des points d'un projet (équipe / groupe). */
export function projectPoints(p: Project): number {
  return p.tasks.reduce((s, t) => s + taskPoints(t), 0)
}

/** Bonus attribué à la meilleure équipe / au meilleur groupe du classement. */
export const TEAM_BONUS = 50

const PER_LEVEL = 50

export function levelOf(pts: number) {
  const level = Math.floor(pts / PER_LEVEL) + 1
  const into = pts % PER_LEVEL
  const medal = level >= 5 ? '🥇' : level >= 3 ? '🥈' : '🥉'
  return { level, into, per: PER_LEVEL, toNext: PER_LEVEL - into, pct: Math.round((into / PER_LEVEL) * 100), medal }
}
