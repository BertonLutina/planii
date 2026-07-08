export const PRIORITIES = [1, 2, 3, 4, 5, 6] as const

const CLS = ['', 'pf1', 'pf2', 'pf3', 'pf4', 'pf5', 'pf6']
const RING = ['', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']
const LABEL = ['', 'la plus urgente', 'très haute', 'haute', 'moyenne', 'basse', 'la plus basse']

/** Normalise une priorité (1–6, défaut 6). */
export function prio(p?: number | null): number {
  const n = Number(p)
  return n >= 1 && n <= 6 ? n : 6
}

/** Métadonnées d'affichage d'une priorité. */
export function prioMeta(p?: number | null) {
  const n = prio(p)
  return { n, flagCls: CLS[n], ringCls: RING[n], label: LABEL[n], tag: 'P' + n }
}
