import { StyleSheet, View } from 'react-native'
import { Skeleton } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Squelette de l'accueil — calqué sur la mise en page finale : carte de score,
   six tuiles du jour, en-tête de groupe, trois rangées de tâches. Jamais de
   tourniquet : l'écran doit déjà avoir sa forme quand les données arrivent. */

export function HomeSkeleton() {
  const { c } = useTheme()
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Chargement" style={s.wrap}>
      <View style={[s.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Skeleton width={84} height={12} />
        <Skeleton width={120} height={26} style={s.gap8} />
        <Skeleton height={8} borderRadius={radius.pill} style={s.gap14} />
        <Skeleton width="66%" height={12} style={s.gap8} />
      </View>

      <View style={s.headRow}>
        <Skeleton width={128} height={17} />
        <Skeleton width={96} height={22} borderRadius={radius.pill} />
      </View>

      <View style={s.grid}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <View key={k} style={[s.tile, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Skeleton width="70%" height={12} />
            <Skeleton width={34} height={24} style={s.gap8} />
            <Skeleton width="90%" height={11} style={s.gap8} />
          </View>
        ))}
      </View>

      <View style={s.grpHead}><Skeleton width={104} height={13} /></View>
      <View style={s.rows}>
        {[0, 1, 2].map((k) => (
          <Skeleton key={k} height={78} borderRadius={radius.card} />
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 18 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16 },
  gap8: { marginTop: 8 },
  gap14: { marginTop: 14 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 18, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48.5%', minHeight: 96, borderRadius: radius.card, borderWidth: 1, padding: 12 },
  grpHead: { marginTop: 20, marginBottom: 10 },
  rows: { gap: 8 },
})
