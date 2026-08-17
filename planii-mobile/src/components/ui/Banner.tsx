import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic, type IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { toneColors, type Tone } from './tone'

export type BannerTone = Extract<Tone, 'accent' | 'ok' | 'warn' | 'danger'>

export interface BannerProps {
  /** Message principal. Utilisez `children` pour une mise en forme riche. */
  text?: string
  children?: ReactNode
  /** `accent` (info) par défaut. */
  tone?: BannerTone
  /** Icône en tête (facultative). */
  icon?: IconName | (string & {})
  style?: StyleProp<ViewStyle>
}

/** Bandeau d'information (`.banner`) : fond de la famille du ton, filet coloré
 *  à gauche, texte de la même famille — jamais du noir sur fond teinté. */
export function Banner({ text, children, tone = 'accent', icon, style }: BannerProps) {
  const { c } = useTheme()
  const t = toneColors(c, tone)
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={text}
      style={[s.box, { backgroundColor: t.bg, borderLeftColor: t.border }, style]}
    >
      {!!icon && <View style={s.ico}><Ic name={icon} s={17} c={t.fg} /></View>}
      <View style={s.body}>
        {text ? <Text style={[s.text, { color: t.fg }]}>{text}</Text> : null}
        {children}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  box: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    borderLeftWidth: 3, borderRadius: radius.control,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14,
  },
  ico: { paddingTop: 1 },
  body: { flex: 1, minWidth: 0 },
  text: { fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
})
