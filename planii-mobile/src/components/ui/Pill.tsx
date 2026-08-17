import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { toneColors, type Tone } from './tone'

export type PillTone = Extract<Tone, 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'> | 'blue'

export interface PillProps {
  label: string
  /** `neutral` par défaut. Le texte reprend la couleur pleine du ton. */
  tone?: PillTone
  style?: StyleProp<ViewStyle>
}

export function Pill({ label, tone = 'neutral', style }: PillProps) {
  const { c } = useTheme()
  const t = toneColors(c, tone)
  return (
    <View style={[s.pill, { backgroundColor: t.bg }, style]}>
      <Text numberOfLines={1} style={[s.text, { color: t.fg }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, alignSelf: 'flex-start' },
  text: { fontSize: 11.5, fontWeight: '700' },
})
