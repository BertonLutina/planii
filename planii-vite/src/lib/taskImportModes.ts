import { cellText, normalizeDue, normalizePriority } from './taskImportNormalize'

export type ImportTaskDraft = {
  title: string
  due: string | null
  priority: number | null
  key: string
}

export type ColumnMapping = {
  titleCol: number
  dueCol: number | null
  priorityCol: number | null
}

function draft(title: string, due: string | null, priority: number | null, key: string): ImportTaskDraft | null {
  const t = title.trim()
  if (!t) return null
  return { title: t.slice(0, 300), due, priority, key }
}

/** Mode A: clicked cell = title; scan same row for date & priority. */
export function draftFromModeA(rows: string[][], r: number, c: number): ImportTaskDraft | null {
  const row = rows[r] || []
  const title = cellText(row[c])
  let due: string | null = null
  let priority: number | null = null
  for (let i = 0; i < row.length; i++) {
    if (i === c) continue
    const cell = row[i]
    if (!due) {
      const d = normalizeDue(cell)
      if (d) { due = d; continue }
    }
    if (priority == null) {
      const p = normalizePriority(cell)
      if (p != null) priority = p
    }
  }
  return draft(title, due, priority, `A:${r}:${c}`)
}

/** Mode B: mapped columns + selected row indexes. */
export function draftsFromModeB(
  rows: string[][],
  mapping: ColumnMapping,
  selectedRowIndexes: number[],
): ImportTaskDraft[] {
  const out: ImportTaskDraft[] = []
  for (const r of selectedRowIndexes) {
    const row = rows[r] || []
    const title = cellText(row[mapping.titleCol])
    const due = mapping.dueCol != null ? normalizeDue(row[mapping.dueCol]) : null
    const priority = mapping.priorityCol != null ? normalizePriority(row[mapping.priorityCol]) : null
    const d = draft(title, due, priority, `B:${r}`)
    if (d) out.push(d)
  }
  return out
}

/** Mode C: each selected cell = title-only task. */
export function draftsFromModeC(
  rows: string[][],
  cells: Array<{ r: number; c: number }>,
): ImportTaskDraft[] {
  const out: ImportTaskDraft[] = []
  for (const { r, c } of cells) {
    const title = cellText((rows[r] || [])[c])
    const d = draft(title, null, null, `C:${r}:${c}`)
    if (d) out.push(d)
  }
  return out
}

export function maxCols(rows: string[][]): number {
  return rows.reduce((m, r) => Math.max(m, r.length), 0)
}
