import { StyleSheet, View } from 'react-native'
import { Skeleton } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Squelette du calendrier — calqué sur la mise en page finale de chaque vue,
   jamais un tourniquet. La vue agenda annonce trois journées de deux lignes ;
   la vue mois annonce la barre de navigation, la ligne des jours et la grille. */

export function CalendarSkeleton({ view }: { view: 'agenda' | 'mois' }) {
  const { c } = useTheme()

  if (view === 'mois') {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Chargement du calendrier">
        <View style={s.bar}>
          <Skeleton width={150} height={17} />
          <View style={s.nav}>
            <Skeleton width={78} height={34} borderRadius={radius.small} />
            <Skeleton width={38} height={38} borderRadius={radius.small} />
            <Skeleton width={38} height={38} borderRadius={radius.small} />
          </View>
        </View>
        <View style={s.dow}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={s.dowCell}><Skeleton width={10} height={11} /></View>
          ))}
        </View>
        <View style={[s.grid, { borderColor: c.line, backgroundColor: c.surface }]}>
          {/* 42 cases : des pastilles fixes plutôt que 42 animations simultanées. */}
          {Array.from({ length: 42 }, (_, i) => (
            <View key={i} style={s.cell}><View style={[s.dot, { backgroundColor: c.surface2 }]} /></View>
          ))}
        </View>
        <View style={s.dayHead}><Skeleton width={130} height={15} /></View>
        <Rows n={2} />
      </View>
    )
  }

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Chargement de l’agenda">
      {[0, 1, 2].map((k) => (
        <View key={k}>
          <View style={s.head}><Skeleton width={k === 0 ? 118 : 96} height={13} /></View>
          <Rows n={k === 0 ? 2 : 1} />
        </View>
      ))}
    </View>
  )
}

function Rows({ n }: { n: number }) {
  return (
    <View style={s.rows}>
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} height={46} borderRadius={radius.small} />
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  dow: { flexDirection: 'row', marginBottom: 6 },
  dowCell: { width: '14.2857%', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  cell: { width: '14.2857%', height: 52, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11 },
  dayHead: { marginTop: 20, marginBottom: 10 },
  head: { paddingTop: 16, paddingBottom: 8 },
  rows: { gap: 8 },
})
