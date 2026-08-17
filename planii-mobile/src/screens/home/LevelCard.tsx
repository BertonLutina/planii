import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { ProgressBar } from '@/components/ui'
import { t } from '@/lib/i18n'
import { levelOf } from '@/lib/points'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, shadow } from '@/theme/tokens'

/* Carte de score — portage de `LevelCard` (planii-vite/src/components/Home.tsx).
   Même barème, même palier de 50 points. La médaille est un accent, jamais le
   seul porteur d'information : le niveau est écrit à côté. */

export interface LevelCardProps {
  points: number
  /** Titre de la carte (défaut : « Mon score »). */
  name?: string
  style?: StyleProp<ViewStyle>
}

export function LevelCard({ points, name, style }: LevelCardProps) {
  const { c } = useTheme()
  const l = levelOf(points)

  return (
    <View
      style={[
        s.card,
        shadow,
        { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.shadowColor },
        style,
      ]}
    >
      <View style={s.top}>
        <View style={s.left}>
          <Text style={[s.hi, { color: c.muted }]}>{name ?? 'Mon score'}</Text>
          <Text style={[s.pts, { color: c.text }]}>
            {points} <Text style={[s.unit, { color: c.muted }]}>pts</Text>
          </Text>
        </View>
        <View style={[s.level, { backgroundColor: c.accentBg }]}>
          <Text style={s.medal}>{l.medal}</Text>
          <Text numberOfLines={1} style={[s.levelTxt, { color: c.accentOn }]}>
            {t('lb.level')} {l.level}
          </Text>
        </View>
      </View>

      <ProgressBar
        value={l.into}
        total={l.per}
        height={8}
        accessibilityLabel={`${l.pct} %`}
        style={s.bar}
      />

      <Text style={[s.next, { color: c.muted }]}>
        Plus que {l.toNext} pts pour le {t('lb.level').toLowerCase()} {l.level + 1}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  left: { flex: 1, minWidth: 0 },
  hi: { fontSize: 13, fontWeight: '600' },
  pts: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  unit: { fontSize: 14, fontWeight: '700', letterSpacing: 0 },
  level: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 11, borderRadius: radius.pill, maxWidth: 150,
  },
  medal: { fontSize: 14 },
  levelTxt: { fontSize: 12.5, fontWeight: '800', flexShrink: 1 },
  bar: { marginTop: 14 },
  next: { fontSize: 12.5, marginTop: 8 },
})
