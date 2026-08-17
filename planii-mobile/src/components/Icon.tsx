import type { ReactNode } from 'react'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import { useTheme } from '@/theme/ThemeProvider'

/* Icônes en trait, portées de `planii-vite/src/components/Icon.tsx` (lucide).
   Même signature d'appel : <Ic name="edit" s={16} c={couleur} />.
   Trait 1.9, bouts et jointures arrondis, boîte 24×24 — la couleur est héritée
   du thème actif, jamais codée en dur. */

const p = (...ds: string[]): ReactNode => ds.map((d, i) => <Path key={i} d={d} />)

const ICONS: Record<string, ReactNode> = {
  /* navigation */
  home: p('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'),
  folder: p('M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z'),
  calendar: (
    <>
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      {p('M16 2v4', 'M8 2v4', 'M3 10h18')}
    </>
  ),
  'calendar-days': (
    <>
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      {p('M16 2v4', 'M8 2v4', 'M3 10h18', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01', 'M8 18h.01', 'M12 18h.01', 'M16 18h.01')}
    </>
  ),
  trophy: p(
    'M6 9H4.5a2.5 2.5 0 0 1 0-5H6',
    'M18 9h1.5a2.5 2.5 0 0 0 0-5H18',
    'M4 22h16',
    'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22',
    'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22',
    'M18 2H6v7a6 6 0 0 0 12 0V2z',
  ),
  user: (
    <>
      {p('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2')}
      <Circle cx={12} cy={7} r={4} />
    </>
  ),
  'user-plus': (
    <>
      {p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M19 8v6', 'M22 11h-6')}
      <Circle cx={9} cy={7} r={4} />
    </>
  ),
  users: (
    <>
      {p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75')}
      <Circle cx={9} cy={7} r={4} />
    </>
  ),
  shield: p('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'),
  search: (
    <>
      <Circle cx={11} cy={11} r={8} />
      {p('m21 21-4.3-4.3')}
    </>
  ),
  bell: p('M10.27 21a2 2 0 0 0 3.46 0', 'M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33'),

  /* actions */
  plus: p('M5 12h14', 'M12 5v14'),
  check: p('M20 6 9 17l-5-5'),
  x: p('M18 6 6 18', 'M6 6l12 12'),
  trash: p('M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'),
  edit: p('M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z', 'm15 5 4 4'),
  mic: (
    <>
      <Rect x={9} y={2} width={6} height={13} rx={3} />
      {p('M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3')}
    </>
  ),
  video: (
    <>
      <Rect x={2} y={6} width={14} height={12} rx={2} />
      {p('m16 12 6-4v8l-6-4z')}
    </>
  ),
  star: p('M12 2.5l2.95 5.98 6.6.96-4.77 4.65 1.12 6.57L12 17.55l-5.9 3.11 1.12-6.57L2.45 9.44l6.6-.96z'),
  clock: (
    <>
      <Circle cx={12} cy={12} r={10} />
      {p('M12 6v6l4 2')}
    </>
  ),
  'clock-late': (
    <>
      <Circle cx={12} cy={12} r={10} />
      {p('M12 6v6l3.5 2')}
    </>
  ),
  flag: p('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'),
  lock: (
    <>
      <Rect x={3} y={11} width={18} height={11} rx={2} />
      {p('M7 11V7a5 5 0 0 1 10 0v4')}
    </>
  ),
  unlock: (
    <>
      <Rect x={3} y={11} width={18} height={11} rx={2} />
      {p('M7 11V7a5 5 0 0 1 9.9-1')}
    </>
  ),

  /* flèches et chevrons */
  'chevron-down': p('m6 9 6 6 6-6'),
  'chevron-up': p('m18 15-6-6-6 6'),
  'chevron-right': p('m9 18 6-6-6-6'),
  'chevron-left': p('m15 18-6-6 6-6'),
  back: p('m12 19-7-7 7-7', 'M19 12H5'),
  'arrow-right': p('M5 12h14', 'm12 5 7 7-7 7'),
  'arrow-up-right': p('M7 7h10v10', 'M7 17 17 7'),
  more: (
    <>
      <Circle cx={12} cy={12} r={1} />
      <Circle cx={19} cy={12} r={1} />
      <Circle cx={5} cy={12} r={1} />
    </>
  ),
  'more-vertical': (
    <>
      <Circle cx={12} cy={12} r={1} />
      <Circle cx={12} cy={5} r={1} />
      <Circle cx={12} cy={19} r={1} />
    </>
  ),

  /* affichage */
  list: p('M3 12h.01', 'M3 18h.01', 'M3 6h.01', 'M8 12h13', 'M8 18h13', 'M8 6h13'),
  board: (
    <>
      <Rect x={3} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={14} width={7} height={7} rx={1} />
      <Rect x={3} y={14} width={7} height={7} rx={1} />
    </>
  ),
  sun: (
    <>
      <Circle cx={12} cy={12} r={4} />
      {p('M12 2v2', 'M12 20v2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41', 'M2 12h2', 'M20 12h2', 'M6.34 17.66l-1.41 1.41', 'M19.07 4.93l-1.41 1.41')}
    </>
  ),
  moon: p('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'),
  monitor: (
    <>
      <Rect x={2} y={3} width={20} height={14} rx={2} />
      {p('M8 21h8', 'M12 17v4')}
    </>
  ),

  /* divers */
  copy: (
    <>
      <Rect x={8} y={8} width={14} height={14} rx={2} />
      {p('M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2')}
    </>
  ),
  refresh: p('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'),
  send: p('m22 2-7 20-4-9-9-4z', 'M22 2 11 13'),
  alert: p('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'),
  info: (
    <>
      <Circle cx={12} cy={12} r={10} />
      {p('M12 16v-4', 'M12 8h.01')}
    </>
  ),
  flame: p('M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z'),
  trending: p('M16 7h6v6', 'm22 7-8.5 8.5-5-5L2 17'),
  settings: (
    <>
      <Circle cx={12} cy={12} r={3} />
      {p('M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z')}
    </>
  ),
  mail: (
    <>
      <Rect x={2} y={4} width={20} height={16} rx={2} />
      {p('m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7')}
    </>
  ),
  logout: p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'),
  filter: p('M22 3H2l8 9.46V19l4 2v-8.54z'),
  sort: p('m21 16-4 4-4-4', 'M17 20V4', 'm3 8 4-4 4 4', 'M7 4v16'),
  grip: (
    <>
      <Circle cx={9} cy={5} r={1} />
      <Circle cx={9} cy={12} r={1} />
      <Circle cx={9} cy={19} r={1} />
      <Circle cx={15} cy={5} r={1} />
      <Circle cx={15} cy={12} r={1} />
      <Circle cx={15} cy={19} r={1} />
    </>
  ),
  megaphone: p('m3 11 18-5v12L3 14v-3z', 'M11.6 16.8a3 3 0 1 1-5.8-1.6'),
  sparkles: p('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 3v3', 'M20.5 4.5h-3', 'M5 17v2', 'M6 18H4'),
  target: (
    <>
      <Circle cx={12} cy={12} r={10} />
      <Circle cx={12} cy={12} r={6} />
      <Circle cx={12} cy={12} r={2} />
    </>
  ),
  inbox: p('M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'),
  message: p('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
  hand: p(
    'M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2',
    'M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2',
    'M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8',
    'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
  ),
  'chart-pie': p('M21.21 15.89A10 10 0 1 1 8 2.83', 'M22 12A10 10 0 0 0 12 2v10z'),
  'chart-bar': p('M3 3v18h18', 'M7 15v3', 'M12 9v9', 'M17 12v6'),
  circle: <Circle cx={12} cy={12} r={10} />,
  'circle-check': (
    <>
      <Circle cx={12} cy={12} r={10} />
      {p('m9 12 2 2 4-4')}
    </>
  ),
  transfer: p('m17 2 4 4-4 4', 'M3 11v-1a4 4 0 0 1 4-4h14', 'm7 22-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3'),
  tasks: p('m3 17 2 2 4-4', 'm3 7 2 2 4-4', 'M13 6h8', 'M13 12h8', 'M13 18h8'),
  poll: p('m9 12 2 2 4-4', 'M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5z', 'M22 19H2'),
  activity: p('M22 12h-4l-3 9L9 3l-3 9H2'),
  help: (
    <>
      <Circle cx={12} cy={12} r={10} />
      {p('M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01')}
    </>
  ),
  eye: (
    <>
      {p('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z')}
      <Circle cx={12} cy={12} r={3} />
    </>
  ),
  'eye-off': p('M10.6 6.2A9.4 9.4 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3 3.9', 'M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.9 9.9 0 0 0 5.4-1.6', 'M14.1 14.1a3 3 0 1 1-4.2-4.2', 'M3 3l18 18'),
  camera: (
    <>
      {p('M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4z')}
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  image: (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Circle cx={9} cy={9} r={2} />
      {p('m21 15-4.5-4.5L7 21')}
    </>
  ),
  link: p('M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'),

  /* barre de navigation (reprise des SVG inline de planii-vite/src/App.tsx) */
  'nav-home': p('M3 11l9-8 9 8', 'M5 10v10h14V10'),
  'nav-projects': (
    <>
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      {p('M3 9h18')}
    </>
  ),
  'nav-agenda': (
    <>
      <Rect x={3} y={4} width={18} height={17} rx={2} />
      {p('M3 9h18', 'M8 2v4', 'M16 2v4')}
    </>
  ),
  'nav-leaderboard': p('M8 21h8', 'M12 17v4', 'M6 4h12v5a6 6 0 0 1-12 0z', 'M6 6H3v2a3 3 0 0 0 3 3', 'M18 6h3v2a3 3 0 0 1-3 3'),
  'nav-profile': (
    <>
      <Circle cx={12} cy={8} r={4} />
      {p('M4 21c0-4 4-6 8-6s8 2 8 6')}
    </>
  ),
  'nav-admin': p('M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z', 'M9.5 12l1.8 1.8L15 10'),
}

/** Noms d'icônes disponibles — typage utile aux appels (`IconName`). */
export type IconName = keyof typeof ICONS
export const ICON_NAMES = Object.keys(ICONS) as IconName[]

export interface IcProps {
  /** Nom de l'icône. Un nom inconnu retombe sur `circle`. */
  name: IconName | (string & {})
  /** Taille en points (défaut 18). */
  s?: number
  /** Couleur du trait (défaut : couleur de texte du thème actif). */
  c?: string
  strokeWidth?: number
}

export function Ic({ name, s = 18, c, strokeWidth = 1.9 }: IcProps) {
  const { c: col } = useTheme()
  const body = ICONS[name] ?? ICONS.circle
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <G fill="none" stroke={c ?? col.text} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {body}
      </G>
    </Svg>
  )
}

export default Ic
