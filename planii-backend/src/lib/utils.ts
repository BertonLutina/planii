import crypto from 'crypto'

export const uid = () => crypto.randomBytes(9).toString('base64url')
export const newToken = () => crypto.randomBytes(18).toString('base64url')

export const numOrNull = (v: unknown) =>
  (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Math.max(0, Number(v))

export const prioOrDefault = (v: unknown) => {
  const n = parseInt(String(v), 10)
  return (n >= 1 && n <= 6) ? n : 6
}

export const cleanColor = (v: unknown, fallback = '#f59e0b') =>
  /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : fallback

export const cleanLabels = (arr: unknown[], maxLen: number, maxCount: number) => {
  const out: string[] = []
  for (const t of arr) {
    if (typeof t !== 'string') continue
    const v = t.trim().slice(0, maxLen)
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v)
    if (out.length >= maxCount) break
  }
  return out
}

export const slugStatus = (s: string) =>
  String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || ('status_' + uid().slice(0, 6))

export const parisHour = () =>
  parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()), 10)

export const parisDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() + offsetDays * 864e5))
