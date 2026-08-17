import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Button, Ic } from '@/components/ui'
import { DOW, MONTHS_FULL, addMonths, isSameDay, isSameMonth, monthGrid, todayMid } from '@/lib/dates'
import { t } from '@/lib/i18n'
import type { CalEvent } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { eventsOfDay } from './useCalendar'

/* Vue mois — refonte pour le téléphone.
   Le web écrit le titre des événements dans chaque case : à 320 px une colonne
   fait 45 px, le texte devient illisible et intouchable. On garde donc la grille
   comme *carte de densité* — jusqu'à trois points par jour, le compte exact
   dans le libellé d'accessibilité — et le détail s'ouvre en dessous, dans une
   liste, quand on appuie sur un jour. Balayage gauche/droite : mois suivant /
   précédent, comme dans les calendriers natifs. */

const CAP = 3 // points affichés au maximum

export interface MonthGridProps {
  cur: Date
  onChangeMonth: (d: Date) => void
  events: CalEvent[]
  selected: Date
  onSelect: (d: Date) => void
}

export function MonthGrid({ cur, onChangeMonth, events, selected, onSelect }: MonthGridProps) {
  const { c } = useTheme()
  const today = todayMid()
  const cells = useMemo(() => monthGrid(cur), [cur])

  const step = (n: number) => onChangeMonth(addMonths(cur, n))

  /* `runOnJS(true)` : les rappels restent sur le fil JS, pas besoin de worklet. */
  const swipe = Gesture.Race(
    Gesture.Fling().direction(Directions.LEFT).runOnJS(true).onEnd(() => step(1)),
    Gesture.Fling().direction(Directions.RIGHT).runOnJS(true).onEnd(() => step(-1)),
  )

  return (
    <View>
      <View style={s.bar}>
        <Text accessibilityRole="header" numberOfLines={1} style={[s.month, { color: c.text }]}>
          {MONTHS_FULL[cur.getMonth()]} {cur.getFullYear()}
        </Text>
        <View style={s.nav}>
          <Button label={t('cal.today')} size="sm" onPress={() => { const d = todayMid(); onChangeMonth(d); onSelect(d) }} />
          <NavBtn icon="chevron-left" label="Mois précédent" onPress={() => step(-1)} />
          <NavBtn icon="chevron-right" label="Mois suivant" onPress={() => step(1)} />
        </View>
      </View>

      <GestureDetector gesture={swipe}>
        <View>
          <View style={s.dow}>
            {DOW.map((d) => (
              <Text key={d} style={[s.dowTxt, { color: c.hint }]}>{d.slice(0, 1)}</Text>
            ))}
          </View>

          <View style={[s.grid, { borderColor: c.line, backgroundColor: c.surface }]}>
            {cells.map((d, i) => {
              const inMonth = isSameMonth(d, cur)
              const isToday = isSameDay(d, today)
              const isSel = isSameDay(d, selected)
              const n = eventsOfDay(events, d).length
              return (
                <Pressable
                  key={i}
                  onPress={() => onSelect(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityLabel={
                    `${d.getDate()} ${MONTHS_FULL[d.getMonth()]}${isToday ? ", aujourd'hui" : ''} — `
                    + (n === 0 ? 'aucune échéance' : n === 1 ? '1 échéance' : `${n} échéances`)
                  }
                  style={({ pressed }) => [
                    s.cell,
                    isSel && { backgroundColor: c.accentBg, borderColor: c.accent },
                    !isSel && pressed && { backgroundColor: c.surface2 },
                  ]}
                >
                  <View style={[s.num, isToday && { backgroundColor: c.accent }]}>
                    <Text
                      style={[
                        s.numTxt,
                        { color: isToday ? c.onAccent : inMonth ? c.text : c.hint },
                        isToday && s.numToday,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                  <View style={s.dots}>
                    {Array.from({ length: Math.min(n, CAP) }, (_, k) => (
                      <View key={k} style={[s.dot, { backgroundColor: inMonth ? c.accent : c.lineStrong }]} />
                    ))}
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>
      </GestureDetector>
    </View>
  )
}

function NavBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const { c } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [s.navBtn, { borderColor: c.lineStrong, backgroundColor: pressed ? c.surface2 : c.surface }]}
    >
      <Ic name={icon} s={18} c={c.text} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  month: { flex: 1, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: { width: 38, height: 38, borderRadius: radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dow: { flexDirection: 'row', marginBottom: 6 },
  /* 100 / 7 — écrit en littéral pour rester une valeur de dimension typée. */
  dowTxt: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  cell: {
    width: '14.2857%', height: 52, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent', gap: 3,
  },
  num: { minWidth: 24, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  numTxt: { fontSize: 13.5, fontWeight: '600' },
  numToday: { fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
})
