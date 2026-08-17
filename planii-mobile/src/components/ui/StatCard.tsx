import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic, type IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, type as ty } from '@/theme/tokens'
import { toneColors, type Tone } from './tone'

export interface StatCardProps {
  /** Valeur mise en avant (26/800). */
  value: string | number
  /** Libellé sous la valeur. */
  label: string
  icon?: IconName | (string & {})
  /** Couleur de l'icône (défaut `accent`). */
  tone?: Tone
  style?: StyleProp<ViewStyle>
}

export function StatCard({ value, label, icon, tone = 'accent', style }: StatCardProps) {
  const { c } = useTheme()
  const t = toneColors(c, tone)
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={[s.box, { backgroundColor: c.surface, borderColor: c.line }, style]}
    >
      {!!icon && <View style={s.ico}><Ic name={icon} s={20} c={t.fg} /></View>}
      <Text style={[s.val, { color: c.text }]}>{value}</Text>
      <Text numberOfLines={2} style={[s.lbl, { color: c.muted }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.card, padding: 16, minWidth: 0 },
  ico: { marginBottom: 4 },
  val: { fontSize: ty.stat.fontSize, fontWeight: '800', lineHeight: 30 },
  lbl: { fontSize: 13, fontWeight: '600', marginTop: 2 },
})
