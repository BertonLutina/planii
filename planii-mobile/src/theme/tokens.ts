/** Jetons de design Planii — reprend les variables CSS de `planii-vite/src/index.css`.
 *  Règle d'or : aucune couleur en dur ailleurs dans l'app. Toujours `useTheme().c.*`.
 *
 *  Trois écarts assumés par rapport au web, tous pour le contraste (WCAG AA,
 *  4.5:1 en petit corps) — le web porte les mêmes défauts et devrait suivre :
 *    1. `muted` / `hint` assombris en clair, `hint` éclairci en sombre ;
 *       les valeurs d'origine tombaient à 4.39:1 et 2.44:1 sur `surface-2`.
 *    2. Les variantes `*On` (`accentOn`, `okOn`…) pour le texte posé sur le
 *       fond pâle de la même famille : `accent` sur `accentBg` ne valait que
 *       3.87:1. La couleur de marque reste `accent` pour les fonds pleins.
 *    3. Les bordures gardent la teinte de marque : un trait de 1 px relève du
 *       seuil 3:1 non-textuel, pas du 4.5:1. */

export interface Colors {
  bg: string
  surface: string
  surface2: string
  line: string
  lineStrong: string
  text: string
  muted: string
  hint: string
  accent: string
  accentBg: string
  accent2: string
  danger: string
  dangerBg: string
  warn: string
  warnBg: string
  ok: string
  okBg: string
  gold: string
  blue: string
  blueBg: string
  soft: string
  accentSoft: string
  elevated: string
  onAccent: string
  accentBorder: string
  /* Texte posé SUR le fond pâle de la même famille (`accentOn` sur `accentBg`).
     En thème clair les teintes de marque tombent entre 3.6:1 et 4.4:1 sur leur
     fond pâle : illisibles en petit corps. Ces variantes assombries passent le
     seuil 4.5:1 sans toucher à la couleur de marque, qui reste `accent` pour
     les fonds pleins (blanc sur `accent` = 4.54:1). En thème sombre les paires
     d'origine sont déjà au-dessus de 4.7:1 : les variantes y sont identiques. */
  accentOn: string
  okOn: string
  warnOn: string
  dangerOn: string
  blueOn: string
  /** Ombre portée — teinte seule ; l'élévation vient de `shadow`. */
  shadowColor: string
  /** Voile derrière les modales / feuilles. */
  scrim: string
}

export const light: Colors = {
  bg: '#f7f7f8',
  surface: '#ffffff',
  surface2: '#f0f0f2',
  line: '#e5e5e7',
  lineStrong: '#d6d6da',
  text: '#0d0d0d',
  // Assombris par rapport à index.css (#6e6e80 / #9a9aa6) : l'original tombait
  // à 4.39:1 (muted) et 2.44:1 (hint) sur `surface-2`.
  muted: '#68687a',
  hint: '#6a6a76',
  accent: '#6d5cff',
  accentBg: '#efeaff',
  accent2: '#8b7bff',
  danger: '#c8362f',
  dangerBg: '#fdeceb',
  warn: '#a5680a',
  warnBg: '#fdf2df',
  ok: '#0f8f6a',
  okBg: '#e2f6ef',
  gold: '#c98a12',
  blue: '#1f6fc9',
  blueBg: '#e7f0fc',
  soft: '#f0f0f2',
  accentSoft: '#efeaff',
  elevated: '#ffffff',
  onAccent: '#ffffff',
  accentBorder: 'rgba(109,92,255,0.30)',
  // Contrastes sur le fond pâle correspondant : 5.07 · 4.73 · 5.55 · 4.57 · 5.75
  accentOn: '#5a48e8',
  okOn: '#0b7a5a',
  warnOn: '#8a5608',
  dangerOn: '#c8362f',
  blueOn: '#1a5da8',
  shadowColor: '#000000',
  scrim: 'rgba(13,13,13,0.45)',
}

export const dark: Colors = {
  bg: '#100e1a',
  surface: '#191426',
  surface2: '#231d3a',
  line: '#2a2442',
  lineStrong: '#382f59',
  text: '#f3f1fb',
  muted: '#a29dbf',
  // Éclairci par rapport à index.css (#726d92) : 3.30:1 sur `surface-2`.
  hint: '#8b86aa',
  accent: '#8b7bff',
  accentBg: '#231d44',
  accent2: '#a78bff',
  danger: '#ff8189',
  dangerBg: '#2a1418',
  warn: '#ffc44d',
  warnBg: '#2a2010',
  ok: '#3ce0ab',
  okBg: '#0f2a21',
  gold: '#ffc44d',
  blue: '#5cb0ff',
  blueBg: '#12233a',
  soft: '#231d3a',
  accentSoft: '#231d44',
  elevated: '#221c38',
  onAccent: '#12101c',
  accentBorder: 'rgba(139,123,255,0.38)',
  // Déjà 4.79 · 9.06 · 10.10 · 7.22 · 6.86 sur leur fond pâle : rien à corriger.
  accentOn: '#8b7bff',
  okOn: '#3ce0ab',
  warnOn: '#ffc44d',
  dangerOn: '#ff8189',
  blueOn: '#5cb0ff',
  shadowColor: '#000000',
  scrim: 'rgba(0,0,0,0.6)',
}

/** Dégradé accent (`--grad-accent`) — mêmes bornes dans les deux thèmes. */
export const gradAccent = ['#8b7bff', '#6d5cff'] as const

/** Rayons — cartes 14, contrôles 12 (petits 10), pastilles 99, drapeaux 6. */
export const radius = {
  card: 14,
  control: 12,
  small: 10,
  flag: 6,
  pill: 99,
} as const

/** Rythme vertical : 6 · 8 · 10 · 12 · 14 · 18. */
export const space = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 18,
} as const

/** Échelle typographique reprise du design system web. */
export const type = {
  pageTitle: { fontSize: 28, fontWeight: '800' },
  stat: { fontSize: 26, fontWeight: '800' },
  titleLg: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  /** Champs : 16 px minimum sur mobile (évite le zoom iOS). */
  input: { fontSize: 16, fontWeight: '400' },
  button: { fontSize: 13.5, fontWeight: '700' },
  sub: { fontSize: 13, fontWeight: '400' },
  groupHeader: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  flag: { fontSize: 10.5, fontWeight: '700' },
} as const

/** Ombre `--shadow` portée sur iOS et Android. */
export const shadow = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 2,
} as const

/** Cible tactile minimale (44 pt). */
export const HIT = 44
