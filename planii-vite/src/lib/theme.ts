export type Theme = 'light' | 'dark' | 'auto'
const KEY = 'planii.theme'

export function getTheme(): Theme {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' || t === 'auto' ? t : 'auto'
}

export function applyTheme(t: Theme) {
  localStorage.setItem(KEY, t)
  document.documentElement.dataset.theme = t
}

/** Thème effectif réellement affiché (auto → selon le système). */
export function effectiveTheme(t: Theme): 'light' | 'dark' {
  if (t === 'auto') return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return t
}
