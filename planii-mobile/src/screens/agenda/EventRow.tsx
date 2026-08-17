import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ic, toneColors, type IconName, type Tone } from '@/components/ui'
import type { CalEvent } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Ligne d'événement — équivalent de `.cal-ev` du web.
   Le web n'encode l'état que par la couleur (🚩 / ✓ mis à part) : ici chaque
   état porte aussi une icône et un libellé lu par les lecteurs d'écran. */

export type EventKind = 'deadline' | 'done' | 'over' | 'plain'

export function kindOf(e: CalEvent): EventKind {
  return e.deadline ? 'deadline' : e.done ? 'done' : e.over ? 'over' : 'plain'
}

const TONE: Record<EventKind, Tone> = {
  deadline: 'accent', done: 'ok', over: 'danger', plain: 'neutral',
}
const ICON: Record<EventKind, IconName> = {
  deadline: 'flag', done: 'circle-check', over: 'clock-late', plain: 'circle',
}
const A11Y: Record<EventKind, string> = {
  deadline: 'livraison', done: 'terminée', over: 'en retard', plain: 'échéance',
}

export function EventRow({ e, onPress }: { e: CalEvent; onPress: (projectId: string) => void }) {
  const { c } = useTheme()
  const kind = kindOf(e)
  const tc = toneColors(c, TONE[kind])
  const fg = kind === 'plain' ? c.text : tc.fg

  return (
    <Pressable
      onPress={() => onPress(e.pid)}
      accessibilityRole="button"
      accessibilityLabel={`${e.title} — ${A11Y[kind]}${e.pname ? ` — ${e.pname}` : ''}`}
      style={({ pressed }) => [
        s.row,
        { backgroundColor: pressed ? c.surface2 : tc.bg, borderLeftColor: tc.border },
      ]}
    >
      <Ic name={ICON[kind]} s={15} c={tc.fg} />
      <View style={s.body}>
        <Text
          numberOfLines={2}
          style={[s.title, { color: fg }, e.done && { textDecorationLine: 'line-through', color: c.muted }]}
        >
          {e.title}
        </Text>
        {!!e.pname && <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>{e.pname}</Text>}
      </View>
      <Ic name="chevron-right" s={16} c={c.hint} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 3, borderRadius: radius.small,
    paddingVertical: 10, paddingHorizontal: 12, minHeight: 46,
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
  sub: { fontSize: 12.5, marginTop: 1 },
})
