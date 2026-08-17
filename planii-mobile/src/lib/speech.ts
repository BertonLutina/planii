/* Reconnaissance & synthèse vocales natives + analyseurs — portage de
   `planii-vite/src/lib/speech.ts`.

   Le web s'appuie sur la Web Speech API du navigateur ; il n'existe aucun point
   de transcription côté serveur. L'équivalent natif est `expo-speech-recognition`
   (SFSpeechRecognizer sur iOS, SpeechRecognizer sur Android) pour l'écoute et
   `expo-speech` pour la synthèse. Deux conséquences :

   1. `expo-speech-recognition` a un plugin de configuration : il n'existe pas
      dans Expo Go, seulement dans un build de développement. Le module est donc
      chargé paresseusement dans un `try` — `requireNativeModule` lève à
      l'import quand la partie native est absente, et une exception au niveau
      module ferait tomber le bundle entier. `speechSupported()` renvoie alors
      `false` et l'interface masque le micro, exactement comme le web le fait
      quand `SpeechRecognition` manque.
   2. `listen()` devient asynchrone : l'autorisation micro se demande au premier
      usage, pas au démarrage de l'app.

   Les analyseurs (`norm`, `parsePriority`, `parseDueDate`, `matchFromList`,
   `saysNobody`, `saysNone`, `saysMe`) sont repris à l'identique du web : ils ne
   dépendent d'aucune plateforme et les deux applications doivent rester
   comparables ligne à ligne. */

import { AppState, type NativeEventSubscription } from 'react-native'
import * as Speech from 'expo-speech'
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition'
import { getLang, type Lang } from './i18n'

/** BCP-47 locales, indexées par `Lang` — même table que le web. */
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

/* ---------- chargement paresseux du module natif ---------- */

type SpeechApi = typeof import('expo-speech-recognition')

let api: SpeechApi | null | undefined

/** Le module natif, ou `null` sous Expo Go (aucun binaire compilé). */
function nativeApi(): SpeechApi | null {
  if (api !== undefined) return api
  try {
    api = require('expo-speech-recognition') as SpeechApi
  } catch {
    api = null
  }
  return api
}

/** `true` si l'appareil sait reconnaître la parole *et* que la partie native
 *  est présente. Faux sous Expo Go : le micro doit alors disparaître. */
export const speechSupported = (): boolean => {
  const m = nativeApi()
  if (!m) return false
  try {
    return m.ExpoSpeechRecognitionModule.isRecognitionAvailable()
  } catch {
    return false
  }
}

/* ---------- autorisations ---------- */

/** `denied` : refusé mais redemandable. `blocked` : refusé définitivement,
 *  seul un passage par les réglages système le rouvre. */
export type MicPermission = 'granted' | 'denied' | 'blocked' | 'unsupported'

/** Demande micro + reconnaissance vocale, au premier usage seulement. */
export async function ensureMicPermission(): Promise<MicPermission> {
  const m = nativeApi()
  if (!m) return 'unsupported'
  const mod = m.ExpoSpeechRecognitionModule
  try {
    const cur = await mod.getPermissionsAsync()
    if (cur.granted) return 'granted'
    /* Déjà refusé sans possibilité de redemander : on n'ouvre pas une boîte de
       dialogue qui ne s'affichera jamais, on renvoie l'état bloqué. */
    if (!cur.canAskAgain) return 'blocked'
    const next = await mod.requestPermissionsAsync()
    if (next.granted) return 'granted'
    return next.canAskAgain ? 'denied' : 'blocked'
  } catch {
    return 'unsupported'
  }
}

/* ---------- écoute ---------- */

export interface Recognizer {
  /** Arrêt propre : un dernier résultat final est encore émis. */
  stop: () => void
  /** Arrêt immédiat — démontage, fermeture, mise en arrière-plan. Aucun texte
   *  n'est appliqué, mais `onEnd` part quand même : sans lui l'interface
   *  resterait bloquée sur « à l'écoute ». */
  abort: () => void
}

/** Codes d'erreur remontés à l'appelant. Les codes natifs passent tels quels ;
 *  `unsupported` et `blocked` sont propres à ce portage. */
export type SpeechError = ExpoSpeechRecognitionErrorCode | 'unsupported' | 'blocked' | 'start-failed'

export interface ListenOptions {
  onText?: (t: string, isFinal: boolean) => void
  onFinal?: (t: string) => void
  onEnd?: () => void
  onError?: (e: SpeechError) => void
  continuous?: boolean
  lang?: Lang
}

/* Un moteur de reconnaissance laissé en marche garde le micro et vide la
   batterie : tous les écouteurs vivants sont suivis ici et coupés dès que
   l'application passe en arrière-plan. */
const live = new Set<Recognizer>()
let appSub: NativeEventSubscription | null = null

function watchAppState() {
  if (appSub) return
  appSub = AppState.addEventListener('change', (state) => {
    if (state !== 'active') stopAllListening()
  })
}

/** Coupe toute écoute en cours (arrière-plan, démontage d'écran, déconnexion). */
export function stopAllListening(): void {
  for (const r of [...live]) r.abort()
  live.clear()
}

/** Démarre une écoute. `onText` reçoit l'interim puis le final, `onEnd` à la fin.
 *  Renvoie `null` si la reconnaissance est indisponible ou l'autorisation
 *  refusée — `onError` a alors déjà été appelé avec la raison. */
export async function listen({
  onText, onFinal, onEnd, onError, continuous = false, lang,
}: ListenOptions): Promise<Recognizer | null> {
  const m = nativeApi()
  if (!m) { onError?.('unsupported'); return null }

  const perm = await ensureMicPermission()
  if (perm !== 'granted') {
    onError?.(perm === 'unsupported' ? 'unsupported' : perm === 'blocked' ? 'blocked' : 'not-allowed')
    return null
  }

  /* Le moteur natif est un singleton : une seconde écoute lancée par-dessus la
     première lui volerait ses résultats. On solde la précédente d'abord. */
  stopAllListening()

  const mod = m.ExpoSpeechRecognitionModule
  const subs: { remove: () => void }[] = []
  let finalText = ''
  let closed = false

  const rec: Recognizer = {
    stop: () => { try { mod.stop() } catch { /* déjà arrêté */ } },
    abort: () => { try { mod.abort() } catch { /* déjà arrêté */ } finish(true) },
  }

  function finish(aborted = false) {
    if (closed) return
    closed = true
    for (const s of subs) s.remove()
    subs.length = 0
    live.delete(rec)
    if (!aborted) onFinal?.(finalText.trim())
    onEnd?.()
  }

  const join = (extra: string) => (finalText + ' ' + extra).replace(/\s+/g, ' ').trim()

  subs.push(mod.addListener('result', (e) => {
    const txt = e.results?.[0]?.transcript ?? ''
    if (e.isFinal) {
      finalText = join(txt)
      onText?.(finalText, true)
    } else if (txt) {
      onText?.(join(txt), false)
    }
  }))

  subs.push(mod.addListener('error', (e) => {
    /* « aucune parole » et « interrompu » ne sont pas des pannes : l'événement
       `end` suit et la dictée se termine simplement sans texte. */
    if (e.error === 'no-speech' || e.error === 'aborted') return
    onError?.(e.error)
  }))

  subs.push(mod.addListener('end', () => finish()))

  try {
    mod.start({
      lang: speechLocale(lang || getLang()),
      interimResults: true,
      continuous,
      maxAlternatives: 1,
      /* Sans équivalent web : la ponctuation dictée évite d'avoir à la retaper. */
      addsPunctuation: true,
      iosTaskHint: 'dictation',
    })
  } catch {
    closed = true
    for (const s of subs) s.remove()
    onError?.('start-failed')
    return null
  }

  live.add(rec)
  watchAppState()
  return rec
}

/* ---------- synthèse ---------- */

/** Lit un texte à voix haute (assistant guidé), dans la langue de l'app. */
export function speak(text: string, lang?: Lang): void {
  try {
    Speech.stop()
    Speech.speak(text, { language: speechLocale(lang || getLang()), rate: 1.05 })
  } catch { /* noop */ }
}

export function stopSpeaking(): void {
  try { Speech.stop() } catch { /* noop */ }
}

/* ---------- analyseurs (FR + EN ; autres langues : chiffres / ISO) ---------- */

/** Normalise : minuscules, sans accents, espaces compactés. */
export const norm = (s: string): string =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

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
  const m = t.match(/\b(?:priorite|priority|priorit|p)\s*([1-6])\b/) || t.match(/\b([1-6])\b/)
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
