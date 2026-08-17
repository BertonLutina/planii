import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

export interface ProgressBarProps {
  /** Part réalisée. */
  value?: number
  /** Total (0 → barre vide). */
  total?: number
  /** Couleur de remplissage (défaut `accent`). */
  color?: string
  /** Épaisseur de la piste (8 par défaut). */
  height?: number
  /** Libellé lu par les lecteurs d'écran (défaut : « x sur y »). */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

export function ProgressBar({ value = 0, total = 0, color, height = 8, accessibilityLabel, style }: ProgressBarProps) {
  const { c } = useTheme()
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${value} sur ${total}`}
      accessibilityValue={{ min: 0, max: Math.max(total, 1), now: value, text: `${pct} %` }}
      style={[s.track, { backgroundColor: c.surface2, height, borderRadius: radius.pill }, style]}
    >
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color ?? c.accent, borderRadius: radius.pill }} />
    </View>
  )
}

const s = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
})
