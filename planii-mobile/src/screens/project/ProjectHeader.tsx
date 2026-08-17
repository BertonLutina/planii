import { StyleSheet, Text, View } from 'react-native'
import { Avatar, Ic, Pill, ProgressBar } from '@/components/ui'
import { mediaUrl } from '@/lib/api'
import { TYPE_LABEL, formatDue } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { projectPoints } from '@/lib/points'
import type { Project } from '@/lib/types'
import { health } from '@/lib/ui'
import { useTheme } from '@/theme/ThemeProvider'

/** En-tête compact du projet : image, nom, avancement, livraison, statut.
 *  Reste fixe au-dessus des onglets — les réglages passent par le menu du
 *  bandeau natif, jamais en ligne. */
export function ProjectHeader({ p }: { p: Project }) {
  const { c } = useTheme()
  const done = p.doneCount ?? p.tasks.filter((x) => x.done).length
  const total = p.taskCount ?? p.tasks.length
  const h = health(total, done, p.status)
  const closed = p.status === 'done'
  const fill = c[h.color]

  return (
    <View style={[s.wrap, { borderBottomColor: c.line, backgroundColor: c.surface }]}>
      <View style={s.row}>
        <Avatar name={p.name} size={40} src={mediaUrl(p.imageUrl)} />
        <View style={s.body}>
          <Text numberOfLines={1} style={[s.name, { color: c.text }]}>{p.name}</Text>
          <View style={s.meta}>
            <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>{TYPE_LABEL[p.type]}</Text>
            <Ic name="star" s={11} c={c.gold} />
            <Text style={[s.sub, { color: c.muted }]}>{projectPoints(p)} pts</Text>
            {!!p.deadline && (
              <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>
                · {t('pd.delivery')} {formatDue(p.deadline)}
              </Text>
            )}
          </View>
        </View>
        <Pill label={closed ? t('term.doneSt') : `${done}/${total}`} tone={closed ? 'ok' : 'accent'} />
      </View>
      <ProgressBar
        value={done}
        total={Math.max(total, 1)}
        color={fill}
        height={6}
        accessibilityLabel={`${done} ${t('projects.tasks')} / ${total}`}
        style={s.bar}
      />
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' },
  sub: { fontSize: 12.5, flexShrink: 1 },
  bar: { marginTop: 10 },
})
