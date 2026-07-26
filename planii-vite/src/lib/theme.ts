export type Theme = 'light' | 'dark' | 'auto'
const KEY = 'planii.theme'

/** Auto : sombre de 19h à 7h (heure locale), clair le reste du temps. */
const AUTO_DARK_FROM = 19
const AUTO_DARK_UNTIL = 7

export function getTheme(): Theme {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' || t === 'auto' ? t : 'auto'
}

/** Thème effectif réellement affiché (auto → selon l’heure locale). */
export function effectiveTheme(t: Theme = getTheme()): 'light' | 'dark' {
  if (t === 'light' || t === 'dark') return t
  const h = new Date().getHours()
  return h >= AUTO_DARK_FROM || h < AUTO_DARK_UNTIL ? 'dark' : 'light'
}

let autoTimer: ReturnType<typeof setInterval> | undefined

function syncResolved() {
  const pref = getTheme()
  const resolved = effectiveTheme(pref)
  const root = document.documentElement
  root.dataset.themePref = pref
  if (root.dataset.theme !== resolved) {
    root.dataset.theme = resolved
    window.dispatchEvent(new Event('planii-theme'))
  } else {
    root.dataset.theme = resolved
  }
}

export function applyTheme(t: Theme) {
  localStorage.setItem(KEY, t)
  syncResolved()

  if (autoTimer !== undefined) {
    clearInterval(autoTimer)
    autoTimer = undefined
  }
  if (t === 'auto') {
    // Recalcule à chaque minute pour basculer à 7h / 19h sans recharger
    autoTimer = setInterval(syncResolved, 60_000)
  }
}
