/** Normalize spreadsheet cell values into Planii task fields. */

const PAD = (n: number) => String(n).padStart(2, '0')

function ymd(y: number, m: number, d: number): string | null {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (y < 1970 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${PAD(m)}-${PAD(d)}`
}

/** Excel serial date (days since 1899-12-30). */
function fromExcelSerial(n: number): string | null {
  if (!Number.isFinite(n) || n < 1 || n > 60000) return null
  const utc = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000
  const dt = new Date(utc)
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

export function normalizeDue(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return fromExcelSerial(value)
  if (value instanceof Date && !isNaN(value.getTime())) {
    return ymd(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
  }

  const s = String(value).trim()
  if (!s) return null

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return ymd(+iso[1], +iso[2], +iso[3])

  const asNum = Number(s)
  if (/^\d+(\.\d+)?$/.test(s) && asNum > 20000 && asNum < 60000) return fromExcelSerial(asNum)

  const dmy = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/)
  if (dmy) {
    let y = +dmy[3]
    if (y < 100) y += 2000
    const a = +dmy[1]
    const b = +dmy[2]
    // Prefer day-first (EU): DD/MM/YYYY when day is plausible
    if (a > 12 && b <= 12) return ymd(y, b, a)
    if (b > 12 && a <= 12) return ymd(y, a, b)
    return ymd(y, b, a)
  }

  return null
}

const PRIO_WORDS: Record<string, number> = {
  high: 1, haute: 1, haut: 1, urgente: 1, urgent: 1, p1: 1,
  medium: 3, moyenne: 3, moyen: 3, normale: 3, normal: 3, p3: 3,
  low: 5, basse: 5, bas: 5, p5: 5,
  p2: 2, p4: 4, p6: 6,
}

export function normalizePriority(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.round(value)
    return n >= 1 && n <= 6 ? n : null
  }
  const s = String(value).trim().toLowerCase()
  if (!s) return null
  const fromWord = PRIO_WORDS[s]
  if (fromWord) return fromWord
  const m = s.match(/^p?\s*([1-6])$/)
  if (m) return +m[1]
  const n = parseInt(s, 10)
  return n >= 1 && n <= 6 ? n : null
}

export function cellText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Keep integers clean; leave decimals as-is for titles
    return Number.isInteger(value) ? String(value) : String(value)
  }
  return String(value).trim()
}
