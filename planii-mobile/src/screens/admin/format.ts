import { MONTHS } from '@/lib/dates'
import { t } from '@/lib/i18n'

/* Le web formate ses dates avec `toLocaleDateString(getLang())`. Le reste de
   l'app mobile n'utilise jamais `Intl` (voir `lib/dates.ts`, qui porte ses
   propres tableaux de mois) : on reste sur la même mécanique, mêmes libellés
   dans les neuf langues, sans dépendre du moteur JS de l'appareil. */

const two = (n: number) => String(n).padStart(2, '0')

const parse = (s?: string | null): Date | null => {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** « 12 août 2026 ». */
export function fmtDate(s?: string | null): string {
  const d = parse(s)
  if (!d) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** « 12 août · 14:05 ». */
export function fmtDateTime(s?: string | null): string {
  const d = parse(s)
  if (!d) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${two(d.getHours())}:${two(d.getMinutes())}`
}

/** « 12 août » à partir d'un jour ISO `YYYY-MM-DD` (barres du graphique). */
export function fmtDay(iso: string): string {
  const p = String(iso).slice(0, 10).split('-')
  const m = Number(p[1]) - 1
  if (!(m >= 0 && m <= 11)) return iso
  return `${Number(p[2])} ${MONTHS[m]}`
}

/** « il y a 3 h », « jamais »… — même échelle que le web. */
export function fmtAgo(s?: string | null): string {
  const d = parse(s)
  if (!d) return t('ad.never')
  const k = Math.round((Date.now() - d.getTime()) / 60000)
  if (k < 1) return t('ad.now')
  if (k < 60) return t('ad.agoMin', { n: k })
  const h = Math.round(k / 60)
  if (h < 24) return t('ad.agoH', { n: h })
  const j = Math.round(h / 24)
  if (j < 30) return t('ad.agoD', { n: j })
  return fmtDate(s)
}

/** Repli texte d'un corps de mail HTML — même nettoyage que le web. */
export function htmlToText(h?: string | false | null): string {
  if (!h) return ''
  return String(h)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
