import { StyleSheet, View } from 'react-native'
import { Skeleton } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Squelette de la liste des projets — même gabarit qu'une `ProjectCard` :
   vignette + titre + type, une rangée de statistiques, la barre d'avancement.
   L'écran garde sa forme pendant le chargement, sans tourniquet. */

export function ProjectsSkeleton({ count = 4 }: { count?: number }) {
  const { c } = useTheme()
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Chargement" style={s.wrap}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[s.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={s.head}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={s.titles}>
              <Skeleton width="72%" height={15} />
              <Skeleton width="44%" height={12} style={s.gap6} />
            </View>
            <Skeleton width={68} height={22} borderRadius={radius.pill} />
          </View>
          <View style={s.stats}>
            <Skeleton width={40} height={12} />
            <Skeleton width={82} height={12} />
            <Skeleton width={62} height={12} />
          </View>
          <View style={s.prog}>
            <Skeleton height={8} borderRadius={radius.pill} style={s.bar} />
            <Skeleton width={38} height={12} />
          </View>
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titles: { flex: 1, minWidth: 0 },
  gap6: { marginTop: 6 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prog: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1 },
})
