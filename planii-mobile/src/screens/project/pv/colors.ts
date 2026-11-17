/* Équivalents des `color-mix(in srgb, …)` de project-v3.css : le web teinte les pastilles de
   statut en mélangeant la couleur du statut avec la couleur du texte du thème. */

function parseHex(h: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim())
  if (!m) return null
  const v = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1]
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

/** `hex` à l'opacité `a` (0–1). Couleur illisible : renvoyée telle quelle. */
export function alpha(hex: string, a: number): string {
  const rgb = parseHex(hex)
  return rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})` : hex
}

/** `pct` % de `a` + le reste de `b` (même résultat que `color-mix(in srgb, a pct%, b)`). */
export function mix(a: string, b: string, pct: number): string {
  const x = parseHex(a)
  const y = parseHex(b)
  if (!x || !y) return a
  const k = pct / 100
  const c = (i: number) => Math.round(x[i] * k + y[i] * (1 - k))
  return `rgb(${c(0)},${c(1)},${c(2)})`
}

const AV = ['#6d5cff', '#1f6fc9', '#0b7a5a', '#b45309', '#be185d', '#7c3aed']

/** Couleur d'avatar stable par nom — même formule que `avatarColor` du web. */
export function avatarColor(name?: string): string {
  let h = 0
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AV[h % AV.length]
}
