/* Reconnaissance & synthèse vocales (Web Speech API) + analyseurs.
   La langue suit le choix login/profil via getLang() — pas de dépendance serveur. */

import { getLang, type Lang } from './i18n'

/** BCP-47 locales for Web Speech API, keyed by Planii Lang. */
const SPEECH_LOCALES: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  nl: 'nl-NL',
  es: 'es-ES',
  pt: 'pt-PT',
  it: 'it-IT',
  el: 'el-GR',
  ru: 'ru-RU',
  sw: 'sw-KE',
}

export function speechLocale(lang: Lang = getLang()): string {
  return SPEECH_LOCALES[lang] || 'fr-FR'
}

export const speechSupported = (): boolean =>
  typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

/** Normalise : minuscules, sans accents, espaces compactés. */
export const norm = (s: string): string =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

export interface Recognizer { stop: () => void }

/** Démarre une écoute. onText reçoit le texte (interim puis final), onEnd à la fin.
 *  `lang` defaults to the app language (login / profile). */
export function listen(
  { onText, onFinal, onEnd, onError, continuous = false, lang }:
  { onText?: (t: string, isFinal: boolean) => void; onFinal?: (t: string) => void; onEnd?: () => void; onError?: (e: string) => void; continuous?: boolean; lang?: Lang },
): Recognizer | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { onError?.('unsupported'); return null }
  const r = new SR()
  r.lang = speechLocale(lang || getLang())
  r.interimResults = true
  r.continuous = continuous
  let finalText = ''
  r.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) finalText += res[0].transcript
      else interim += res[0].transcript
    }
    onText?.((finalText + interim).trim(), false)
    if (finalText) onText?.(finalText.trim(), true)
  }
  r.onerror = (e: any) => onError?.(e?.error || 'error')
  r.onend = () => { onFinal?.(finalText.trim()); onEnd?.() }
  try { r.start() } catch { onError?.('start-failed'); return null }
  return { stop: () => { try { r.stop() } catch { /* noop */ } } }
}

/** Lit un texte à voix haute (pour l'assistant guidé), dans la langue de l'app. */
export function speak(text: string, lang?: Lang): void {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = speechLocale(lang || getLang())
    u.rate = 1.05
    // Prefer a voice matching the locale when available
    const want = u.lang.slice(0, 2).toLowerCase()
    const voices = synth.getVoices?.() || []
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(want))
    if (match) u.voice = match
    synth.speak(u)
  } catch { /* noop */ }
}

export function stopSpeaking(): void { try { window.speechSynthesis?.cancel() } catch { /* noop */ } }

/* ---------- analyseurs (FR + EN ; autres langues : chiffres / ISO) ---------- */

const NUM_WORDS: Record<string, number> = {
  un: 1, une: 1, one: 1,
  deux: 2, two: 2,
  trois: 3, three: 3,
  quatre: 4, four: 4,
  cinq: 5, five: 5,
  six: 6,
}

/** Extrait une priorité 1–6 d'une phrase, ou null si rien de reconnu. */
export function parsePriority(text: string): number | null {
  const t = norm(text)
  let m = t.match(/\b(?:priorite|priority|priorit|p)\s*([1-6])\b/) || t.match(/\b([1-6])\b/)
  if (m) return Number(m[1])
  for (const w in NUM_WORDS) {
    if (new RegExp('\\b' + w + '\\b').test(t)) return NUM_WORDS[w]
  }
  if (/la plus urgente|tres urgent|critique|urgentissime|most urgent|critical/.test(t)) return 1
  if (/urgent/.test(t)) return 1
  if (/tres haute|very high/.test(t)) return 2
  if (/haute|elevee|\bhigh\b/.test(t)) return 3
  if (/moyenne|normale|moyen|\bmedium\b|\bnormal\b/.test(t)) return 4
  if (/la plus basse|tres basse|lowest|very low/.test(t)) return 6
  if (/basse|faible|\blow\b/.test(t)) return 5
  return null
}

const MONTHS_FR = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

/** Convertit une phrase en date ISO (yyyy-mm-dd).
 *  Renvoie '' pour « aucune date », ou null si rien n'est reconnu. */
export function parseDueDate(text: string, base = new Date()): string | null {
  const t = norm(text)
  if (!t) return null
  if (/(aucune|pas de date|sans date|aucun|jamais|non merci|^non$|rien|no date|none|never|no thanks|^no$|nothing)/.test(t)) return ''
  const today = new Date(base); today.setHours(0, 0, 0, 0)
  if (/apres.?demain|day after tomorrow/.test(t)) return isoLocal(addDays(today, 2))
  if (/\bdemain\b|\btomorrow\b/.test(t)) return isoLocal(addDays(today, 1))
  if (/aujourd|\btoday\b/.test(t)) return isoLocal(today)
  const rel = t.match(/(?:dans|in)\s+(\d+)\s*(jours?|days?|semaines?|weeks?|mois|months?)/)
  if (rel) {
    const n = Number(rel[1])
    if (/semaine|week/.test(rel[2])) return isoLocal(addDays(today, n * 7))
    if (/mois|month/.test(rel[2])) { const d = new Date(today); d.setMonth(d.getMonth() + n); return isoLocal(d) }
    return isoLocal(addDays(today, n))
  }
  for (let i = 0; i < 7; i++) {
    if (new RegExp('\\b' + DAYS_FR[i] + '\\b').test(t) || new RegExp('\\b' + DAYS_EN[i] + '\\b').test(t)) {
      let diff = (i - today.getDay() + 7) % 7
      if (diff === 0) diff = 7
      return isoLocal(addDays(today, diff))
    }
  }
  const dm = t.match(/\b(\d{1,2})\b/)
  if (dm) {
    const day = Number(dm[1])
    if (day >= 1 && day <= 31) {
      let mon = today.getMonth(); let monthGiven = false
      for (let i = 0; i < 12; i++) {
        if (new RegExp(MONTHS_FR[i]).test(t) || new RegExp(MONTHS_EN[i]).test(t)) {
          mon = i; monthGiven = true; break
        }
      }
      let d = new Date(today.getFullYear(), mon, day)
      if (d < today) d = new Date(today.getFullYear() + (monthGiven ? 1 : 0), monthGiven ? mon : mon + 1, day)
      return isoLocal(d)
    }
  }
  return null
}

/** Cherche dans une liste l'élément dont le nom correspond le mieux à la phrase. */
export function matchFromList<T>(text: string, items: T[], getName: (it: T) => string): T | null {
  const t = norm(text)
  if (!t) return null
  for (const it of items) { const n = norm(getName(it)); if (n && (t === n || t.includes(n) || (n.includes(t) && t.length >= 3))) return it }
  for (const it of items) {
    const tokens = norm(getName(it)).split(' ').filter(Boolean)
    if (tokens.some((tok) => tok.length >= 3 && new RegExp('\\b' + tok + '\\b').test(t))) return it
  }
  return null
}

/** Détecte « personne / à prendre / non assigné » (aucun responsable). */
export const saysNobody = (text: string): boolean =>
  /(personne|a prendre|non assigne|aucun responsable|sans responsable|libre|nobody|no one|noone|unassigned|no assignee|anyone|free)/.test(norm(text))

/** Détecte « aucun / pas de type / sans type ». */
export const saysNone = (text: string): boolean =>
  /(aucun|pas de type|sans type|rien|neant|none|no type|without type|nothing)/.test(norm(text))

/** Détecte « moi / je / pour moi ». */
export const saysMe = (text: string): boolean =>
  /\b(moi|je|pour moi|mien|ma pomme|me|myself|i am|for me|mine)\b/.test(norm(text))
