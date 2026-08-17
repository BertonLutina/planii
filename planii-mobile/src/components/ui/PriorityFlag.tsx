import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { prioMeta } from '@/lib/priority'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, type as ty } from '@/theme/tokens'
import { priorityColors } from './tone'

export interface PriorityFlagProps {
  /** 1 (la plus urgente) à 6. Toute autre valeur est normalisée à 6. */
  priority?: number | null
  style?: StyleProp<ViewStyle>
}

/** Drapeau de priorité : « P1 »…« P6 ». L'information n'est jamais portée par
 *  la couleur seule — le texte et le libellé d'accessibilité la donnent aussi. */
export function PriorityFlag({ priority, style }: PriorityFlagProps) {
  const { c } = useTheme()
  const m = prioMeta(priority)
  const pc = priorityColors(c, m.n)
  return (
    <View
      accessible
      accessibilityLabel={`${m.tag} — ${m.label}`}
      style={[s.flag, { backgroundColor: pc.bg }, style]}
    >
      <Text style={[s.text, { color: pc.fg }]}>{m.tag}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  flag: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: radius.flag, alignSelf: 'flex-start' },
  text: { fontSize: ty.flag.fontSize, fontWeight: '800', lineHeight: 15 },
})
