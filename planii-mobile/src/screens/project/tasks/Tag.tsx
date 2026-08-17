import { StyleSheet, Text, View } from 'react-native'
import { Ic, resolveTone, toneColors } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

export interface TagProps {
  label: string
  icon?: string
  tone?: string
  /** Couleur pleine fournie par le serveur (pastille de statut). */
  dot?: string
}

/** Micro-étiquette de la ligne de tâche (`.tag` du web) : 11.5/700, dense.
 *  Plus léger qu'un `Chip` — une ligne en porte jusqu'à six. */
export function Tag({ label, icon, tone, dot }: TagProps) {
  const { c } = useTheme()
  const tc = toneColors(c, resolveTone(tone))
  return (
    <View style={[s.tag, { backgroundColor: tc.bg }]}>
      {!!dot && <View style={[s.dot, { backgroundColor: dot }]} />}
      {!!icon && <Ic name={icon} s={11} c={tc.fg} strokeWidth={2} />}
      <Text numberOfLines={1} style={[s.txt, { color: tc.fg }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 3, paddingHorizontal: 7, borderRadius: radius.flag,
    maxWidth: '100%', flexShrink: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  txt: { fontSize: 11.5, fontWeight: '700', flexShrink: 1 },
})
