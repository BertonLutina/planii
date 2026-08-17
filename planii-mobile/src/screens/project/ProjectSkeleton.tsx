import { StyleSheet, View } from 'react-native'
import { Skeleton, SkeletonList } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Chargement du projet — le gabarit du résultat, pas un tourniquet :
   en-tête (image + nom + barre), rangée d'onglets, puis lignes de tâches. */
export function ProjectSkeleton() {
  const { c } = useTheme()
  return (
    <View style={s.wrap}>
      <View style={[s.head, { borderBottomColor: c.line, backgroundColor: c.surface }]}>
        <View style={s.row}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={s.lines}>
            <Skeleton width="62%" height={16} />
            <Skeleton width="44%" height={12} />
          </View>
          <Skeleton width={54} height={22} borderRadius={radius.pill} />
        </View>
        <Skeleton height={6} borderRadius={3} style={s.bar} />
      </View>

      <View style={s.body}>
        <Skeleton height={44} borderRadius={radius.control} />
        <View style={s.chips}>
          <Skeleton width={92} height={28} borderRadius={radius.pill} />
          <Skeleton width={72} height={28} borderRadius={radius.pill} />
          <Skeleton width={104} height={28} borderRadius={radius.pill} />
        </View>
        <SkeletonList count={4} itemHeight={92} style={s.list} />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  head: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  lines: { flex: 1, gap: 7 },
  bar: { marginTop: 10 },
  body: { paddingHorizontal: 18, paddingTop: 14 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 16 },
  list: { marginTop: 16 },
})
