import type { Colors } from '@/theme/tokens'

/** Tons sémantiques partagés par Pill, Banner, StatCard, Chip.
 *  Règle : le texte reprend toujours la famille du fond (jamais du noir ni du
 *  blanc), mais dans sa variante `*On` — la teinte de marque assombrie qui
 *  passe 4.5:1 sur le fond pâle en thème clair. La bordure, elle, garde la
 *  couleur de marque : un trait de 1 px relève du 3:1 non-textuel. */
export type Tone = 'accent' | 'ok' | 'warn' | 'danger' | 'blue' | 'neutral'

export interface ToneColors { fg: string; bg: string; border: string }

export function toneColors(c: Colors, tone: Tone): ToneColors {
  switch (tone) {
    case 'ok': return { fg: c.okOn, bg: c.okBg, border: c.ok }
    case 'warn': return { fg: c.warnOn, bg: c.warnBg, border: c.warn }
    case 'danger': return { fg: c.dangerOn, bg: c.dangerBg, border: c.danger }
    case 'blue': return { fg: c.blueOn, bg: c.blueBg, border: c.blue }
    case 'neutral': return { fg: c.muted, bg: c.surface2, border: c.line }
    case 'accent':
    default: return { fg: c.accentOn, bg: c.accentBg, border: c.accent }
  }
}

/** Ton d'un type de tâche (`typeTone()` renvoie 'tt-a'…'tt-e'). */
export type TypeTone = 'tt-a' | 'tt-b' | 'tt-c' | 'tt-d' | 'tt-e'

const TT: Record<TypeTone, Tone> = {
  'tt-a': 'accent', 'tt-b': 'blue', 'tt-c': 'ok', 'tt-d': 'warn', 'tt-e': 'danger',
}

/** Accepte indifféremment un ton sémantique ou la sortie de `typeTone()`. */
export function resolveTone(v?: Tone | TypeTone | string | null): Tone {
  if (!v) return 'neutral'
  if (v in TT) return TT[v as TypeTone]
  return (['accent', 'ok', 'warn', 'danger', 'blue', 'neutral'] as string[]).includes(v) ? (v as Tone) : 'neutral'
}

/** Paire couleur/fond d'une priorité 1–6 (jamais la couleur seule : le texte
 *  « P1 »…« P6 » porte l'information). */
export function priorityColors(c: Colors, n: number): ToneColors {
  switch (n) {
    case 1: return { fg: c.dangerOn, bg: c.dangerBg, border: c.danger }
    case 2: return { fg: c.warnOn, bg: c.warnBg, border: c.warn }
    case 3: return { fg: c.accentOn, bg: c.accentBg, border: c.accent }
    case 4: return { fg: c.blueOn, bg: c.blueBg, border: c.blue }
    case 5: return { fg: c.okOn, bg: c.okBg, border: c.ok }
    default: return { fg: c.muted, bg: c.surface2, border: c.lineStrong }
  }
}
