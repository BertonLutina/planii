import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Avatar, Ic, Pill, toneColors } from '@/components/ui'
import { mediaUrl } from '@/lib/api'
import { ROLE_LABEL, TYPE_LABEL } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import type { RankedProject } from './rank'

/* Rangée du classement (`.rank-lead` du web).
   Le web ne distingue le podium que par la couleur ; ici le rang porte à la
   fois un chiffre et une icône — coupe pour la première place, étoile pour les
   deux suivantes — pour que l'information ne tienne jamais à la teinte seule.
   Les projets dont l'utilisateur est propriétaire sont soulignés d'un filet
   accent et d'une pastille : c'est « sa » ligne dans la liste. */

export interface RankRowProps {
  r: RankedProject
  /** L'utilisateur est propriétaire de ce projet. */
  mine?: boolean
  onPress: (projectId: string) => void
}

export function RankRow({ r, mine = false, onPress }: RankRowProps) {
  const { c } = useTheme()
  const top = r.rank <= 3
  const badge = toneColors(c, top ? 'warn' : 'neutral')

  return (
    <Pressable
      onPress={() => onPress(r.p.id)}
      accessibilityRole="button"
      accessibilityLabel={
        `${r.rank}. ${r.p.name} — ${r.total} points, ${t('lb.level').toLowerCase()} ${r.level}`
        + (r.bonus > 0 ? ` — +${r.bonus} ${t('lb.bonus')}` : '')
      }
      style={({ pressed }) => [
        s.row,
        {
          backgroundColor: pressed ? c.surface2 : c.surface,
          borderColor: mine ? c.accent : c.line,
        },
      ]}
    >
      <View style={[s.badge, { backgroundColor: badge.bg }]}>
        {top && <Ic name={r.rank === 1 ? 'trophy' : 'star'} s={13} c={badge.fg} />}
        <Text style={[s.badgeTxt, { color: top ? badge.fg : c.text }, top && s.badgeTxtTop]}>{r.rank}</Text>
      </View>

      <Avatar name={r.p.name} src={mediaUrl(r.p.imageUrl)} size={38} />

      <View style={s.info}>
        <Text numberOfLines={1} style={[s.name, { color: c.text }]}>{r.p.name}</Text>
        <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>
          {TYPE_LABEL[r.p.type]} · {t('lb.level')} {r.level}
        </Text>
        {(mine || r.bonus > 0) && (
          <View style={s.tags}>
            {mine && <Pill label={ROLE_LABEL.owner} tone="accent" />}
            {r.bonus > 0 && <Pill label={`+${r.bonus} ${t('lb.bonus')}`} tone="warn" />}
          </View>
        )}
      </View>

      <View style={s.pts}>
        <Text style={[s.ptsN, { color: c.text }]}>{r.total}</Text>
        <Text style={[s.ptsU, { color: c.muted }]}>pts</Text>
      </View>
    </Pressable>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: radius.card,
    paddingVertical: 10, paddingHorizontal: 12, minHeight: 62,
  },
  badge: {
    minWidth: 32, paddingHorizontal: 4, paddingVertical: 4,
    borderRadius: radius.small, alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { fontSize: 15, fontWeight: '800' },
  badgeTxtTop: { fontSize: 12.5, lineHeight: 15 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  sub: { fontSize: 12.5, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pts: { alignItems: 'flex-end', minWidth: 42 },
  ptsN: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  ptsU: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, marginTop: -1 },
})
