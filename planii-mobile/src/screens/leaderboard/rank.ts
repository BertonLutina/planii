import { TEAM_BONUS, levelOf, projectPoints } from '@/lib/points'
import type { ProjectSummary } from '@/lib/types'

/* Agrégation du classement — même calcul que `Leaderboard` du web :
   les projets sont classés sur leurs points bruts, et la première place reçoit
   le bonus d'équipe seulement s'il y a une concurrence *et* des points. */

export interface RankedProject {
  p: ProjectSummary
  /** Position affichée (1, 2, 3…). */
  rank: number
  /** Points des tâches terminées. */
  base: number
  /** Bonus d'équipe (0 sauf première place méritée). */
  bonus: number
  total: number
  level: number
}

export function rankProjects(projects: ProjectSummary[]): RankedProject[] {
  const sorted = projects
    .map((p) => ({ p, base: projectPoints(p) }))
    .sort((a, b) => b.base - a.base)

  const bonusWon = sorted.length > 1 && (sorted[0]?.base ?? 0) > 0

  return sorted.map((r, i) => {
    const bonus = i === 0 && bonusWon ? TEAM_BONUS : 0
    const total = r.base + bonus
    return { p: r.p, rank: i + 1, base: r.base, bonus, total, level: levelOf(total).level }
  })
}
