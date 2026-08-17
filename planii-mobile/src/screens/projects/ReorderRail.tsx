import { Pressable, StyleSheet, View } from 'react-native'
import { Ic } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, HIT } from '@/theme/tokens'

/* Réordonnancement manuel — remplaçant du glisser-déposer HTML du web
   (`draggable` + `PUT /projects/order`).
   Deux boutons de 44 pt plutôt qu'un geste de traîne : un ordre se corrige
   d'un cran à la fois, la manœuvre est annulable, et elle reste faisable au
   lecteur d'écran comme au doigt tremblant. Les mêmes actions figurent dans
   le menu de la carte — ce rail n'existe que pour les rendre visibles. */

export interface ReorderRailProps {
  /** Position dans la liste affichée. */
  index: number
  count: number
  onMove: (delta: -1 | 1) => void
  /** Nom du projet — cité dans le libellé d'accessibilité. */
  name: string
}

export function ReorderRail({ index, count, onMove, name }: ReorderRailProps) {
  const { c } = useTheme()
  const first = index === 0
  const last = index === count - 1

  const btn = (dir: -1 | 1, icon: string, label: string, off: boolean) => (
    <Pressable
      onPress={() => onMove(dir)}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${name}`}
      accessibilityState={{ disabled: off }}
      style={({ pressed }) => [
        s.btn,
        {
          backgroundColor: pressed ? c.surface2 : c.surface,
          borderColor: c.line,
          opacity: off ? 0.4 : 1,
        },
      ]}
    >
      <Ic name={icon} s={18} c={c.muted} strokeWidth={2.2} />
    </Pressable>
  )

  return (
    <View style={s.rail}>
      {btn(-1, 'chevron-up', t('guide.prev'), first)}
      {btn(1, 'chevron-down', t('guide.next'), last)}
    </View>
  )
}

const s = StyleSheet.create({
  rail: { gap: 8, justifyContent: 'center' },
  btn: {
    width: 40, height: HIT, borderRadius: radius.small, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
})
