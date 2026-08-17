import { useMemo } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { MONTHS_FULL, formatDue, isoLocal, isSameDay, todayMid } from '@/lib/dates'
import { DOW } from '@/lib/dates'
import { Pill } from '@/components/ui'
import { t } from '@/lib/i18n'
import type { CalEvent } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { EventRow } from './EventRow'
import { MonthGrid } from './MonthGrid'
import { eventsOfDay } from './useCalendar'

/* Vue mois : la grille de densité en en-tête d'une liste, le détail du jour
   sélectionné en dessous. Une seule liste virtualisée — pas de FlatList
   imbriquée dans un ScrollView. */

export interface MonthViewProps {
  events: CalEvent[]
  cur: Date
  onChangeMonth: (d: Date) => void
  selected: Date
  onSelect: (d: Date) => void
  refreshing: boolean
  onRefresh: () => void
  onOpen: (projectId: string) => void
  header?: React.ReactElement | null
  contentPaddingBottom?: number
}

export function MonthView({
  events, cur, onChangeMonth, selected, onSelect,
  refreshing, onRefresh, onOpen, header, contentPaddingBottom = 24,
}: MonthViewProps) {
  const { c } = useTheme()
  const dayEvents = useMemo(() => eventsOfDay(events, selected), [events, selected])
  const isToday = isSameDay(selected, todayMid())

  return (
    <FlatList
      data={dayEvents}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <View style={s.item}><EventRow e={item} onPress={onOpen} /></View>}
      ListHeaderComponent={
        <View>
          {header}
          <MonthGrid
            cur={cur}
            onChangeMonth={onChangeMonth}
            events={events}
            selected={selected}
            onSelect={onSelect}
          />
          <View style={s.dayHead}>
            <Text accessibilityRole="header" style={[s.dayTxt, { color: c.text }]}>
              {DOW[(selected.getDay() + 6) % 7]} {selected.getDate()} {MONTHS_FULL[selected.getMonth()]}
            </Text>
            {isToday
              ? <Pill label={t('cal.today')} tone="accent" />
              : <Text style={[s.dayDue, { color: c.muted }]}>{formatDue(isoLocal(selected))}</Text>}
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={[s.nothing, { color: c.muted }]}>{t('cal.nothingDay')}</Text>
      }
      contentContainerStyle={[s.body, { paddingBottom: contentPaddingBottom }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
      }
      showsVerticalScrollIndicator={false}
    />
  )
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 18 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  dayTxt: { flex: 1, fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  dayDue: { fontSize: 12.5 },
  item: { marginBottom: 8 },
  nothing: { fontSize: 13.5, paddingVertical: 4 },
})
