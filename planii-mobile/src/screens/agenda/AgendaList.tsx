import { useMemo } from 'react'
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native'
import { EmptyState } from '@/components/ui'
import { DOW, MONTHS, addDays, formatDue, isoLocal, todayMid } from '@/lib/dates'
import { t } from '@/lib/i18n'
import type { CalEvent } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { EventRow } from './EventRow'

/* Vue agenda (par défaut sur mobile) — la liste de ce qui arrive, groupée par
   jour. C'est la seule forme qui tient vraiment dans une colonne de 320 px :
   du texte lisible, une cible tactile pleine largeur, et le défilement natif
   pour parcourir les semaines. */

export interface AgendaListProps {
  events: CalEvent[]
  refreshing: boolean
  onRefresh: () => void
  onOpen: (projectId: string) => void
  /** Contenu inséré au-dessus de la liste (barre d'onglets de l'écran). */
  header?: React.ReactElement | null
  contentPaddingBottom?: number
}

interface DaySection { key: string; date: Date; data: CalEvent[] }

export function AgendaList({ events, refreshing, onRefresh, onOpen, header, contentPaddingBottom = 24 }: AgendaListProps) {
  const { c } = useTheme()

  const sections = useMemo<DaySection[]>(() => {
    const floor = addDays(todayMid(), -1)
    const upcoming = events
      .filter((e) => e.date >= floor)
      .sort((a, b) => a.date.getTime() - b.date.getTime() || a.title.localeCompare(b.title))
    const out: DaySection[] = []
    for (const e of upcoming) {
      const key = isoLocal(e.date)
      const last = out[out.length - 1]
      if (last && last.key === key) last.data.push(e)
      else out.push({ key, date: e.date, data: [e] })
    }
    return out
  }, [events])

  return (
    <SectionList
      sections={sections}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <View style={s.item}><EventRow e={item} onPress={onOpen} /></View>}
      renderSectionHeader={({ section }) => {
        const d = (section as DaySection).date
        return (
          <View accessibilityRole="header" style={[s.head, { backgroundColor: c.bg }]}>
            <Text style={[s.headDay, { color: c.text }]}>
              {DOW[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()]}
            </Text>
            <Text style={[s.headDue, { color: c.muted }]}>{formatDue(isoLocal(d))}</Text>
          </View>
        )
      }}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState icon="calendar-days" title={t('cal.noUpcoming')} />}
      stickySectionHeadersEnabled
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
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 16, paddingBottom: 8 },
  headDay: { fontSize: 13.5, fontWeight: '800', textTransform: 'capitalize' },
  headDue: { fontSize: 12.5 },
  item: { marginBottom: 8 },
})
