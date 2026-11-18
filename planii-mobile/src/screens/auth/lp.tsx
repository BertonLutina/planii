import { StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Ellipse } from 'react-native-svg'

/* Palette de la page d'accueil publique (planii-vite/src/landing.css, jetons --lp-*) :
   fond presque blanc / presque noir, halos violet et vert, titre violet. */
export interface Lp {
  bg: string; card: string; line: string; line2: string
  text: string; muted: string; hint: string
  accFg: string; accBg: string; title2: string
  glow1: string; glow2: string; logoA: string; logoB: string
  dgBg: string; okBg: string
}

export const lpLight: Lp = {
  bg: '#fafafb', card: '#ffffff', line: '#eaeaee', line2: '#dcdce3',
  text: '#0b0a12', muted: '#4a4a60', hint: '#565669',
  accFg: '#5a48e8', accBg: '#f1edff', title2: '#5a48e8',
  glow1: 'rgba(139,123,255,0.30)', glow2: 'rgba(60,224,171,0.13)', logoA: '#8b7bff', logoB: '#6d5cff',
  dgBg: '#fdefee', okBg: '#e6f7f0',
}
export const lpDark: Lp = {
  bg: '#08060f', card: '#14111f', line: 'rgba(255,255,255,0.08)', line2: 'rgba(255,255,255,0.14)',
  text: '#f5f3fc', muted: '#a9a3c6', hint: '#8f89ab',
  accFg: '#b3a5ff', accBg: 'rgba(139,123,255,0.15)', title2: '#a99bff',
  glow1: 'rgba(109,92,255,0.42)', glow2: 'rgba(60,224,171,0.13)', logoA: '#a08fff', logoB: '#6d5cff',
  dgBg: 'rgba(255,129,137,0.15)', okBg: 'rgba(60,224,171,0.12)',
}

/** Halos du haut de page : deux ellipses dégradées, sans flou natif. */
export function Glow({ lp, width }: { lp: Lp; width: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={520} viewBox={`0 0 ${width} 520`}>
        <Defs>
          <RadialGradient id="g1" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={lp.glow1} />
            <Stop offset="1" stopColor={lp.glow1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g2" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={lp.glow2} />
            <Stop offset="1" stopColor={lp.glow2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width * 0.4} cy={40} rx={width * 0.95} ry={260} fill="url(#g1)" />
        <Ellipse cx={width * 1.0} cy={170} rx={width * 0.5} ry={200} fill="url(#g2)" />
      </Svg>
    </View>
  )
}

/** Logo de la page d'accueil : trois barres, dégradé violet. */
export function LandingLogo({ lp, size = 32 }: { lp: Lp; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={lp.logoA} />
          <Stop offset="1" stopColor={lp.logoB} />
        </LinearGradient>
      </Defs>
      <Rect x={12} y={10} width={58} height={21} rx={10.5} fill="url(#lg)" />
      <Rect x={15.5} y={43} width={69} height={14} rx={7} fill="none" stroke="url(#lg)" strokeWidth={7} />
      <Rect x={12} y={69} width={40} height={21} rx={10.5} fill="url(#lg)" />
    </Svg>
  )
}
