import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Avatar, Ic, Pill, ProgressBar } from '@/components/ui'
import { mediaUrl } from '@/lib/api'
import { formatDue, ROLE_LABEL } from '@/lib/dates'
import { t, trTerm } from '@/lib/i18n'
import type { ProjectSummary } from '@/lib/types'
import { health } from '@/lib/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, shadow } from '@/theme/tokens'

/* Carte de projet — portage de `.pcard` (planii-vite/src/components/Projects.tsx).
   La vue « tableau » du web n'est pas reprise : à 360 pt de large, sept colonnes
   deviennent illisibles. La carte porte les mêmes données.
   Appui = ouvrir le projet, appui long = menu d'actions (ordre, édition,
   suppression) — le glisser-déposer HTML du web n'a pas d'équivalent fiable. */

const TYPE_ICON: Record<string, string> = { solo: 'user', team: 'users', group: 'users' }
const typeShortOf = (type: string) =>
  t('proj.type' + type.charAt(0).toUpperCase() + type.slice(1)) || type

export interface ProjectCardProps {
  p: ProjectSummary
  onOpen: () => void
  onMenu: () => void
}

function ProjectCardBase({ p, onOpen, onMenu }: ProjectCardProps) {
  const { c } = useTheme()
  const h = health(p.taskCount, p.doneCount, p.status)
  const barColor = c[h.color]
  const memberCount = Number.isFinite(Number(p.memberCount)) ? Number(p.memberCount) : 1
  const role = p.type !== 'group' ? (ROLE_LABEL[p.my_role] || p.my_role) : ''
  const typeShort = typeShortOf(p.type)
  /* Couleur du libellé : donnée serveur (contenu), pas un jeton de thème.
     Elle ne sert qu'à la pastille — jamais de texte posé dessus. */
  const labelColor = p.labelColor || c.accent
  const labelName = p.labelName ? trTerm(p.labelName) : null

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onMenu}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${typeShort}, ${h.done}/${h.total} ${t('projects.tasks')}, ${h.pct} %`}
      accessibilityHint={t('pd.actions')}
      style={({ pressed }) => [
        s.card,
        shadow,
        {
          backgroundColor: pressed ? c.surface2 : c.surface,
          borderColor: pressed ? c.lineStrong : c.line,
          shadowColor: c.shadowColor,
        },
      ]}
    >
      <View style={s.head}>
        <Avatar name={p.name} size={44} src={mediaUrl(p.imageUrl)} />
        <View style={s.titles}>
          <Text numberOfLines={2} style={[s.name, { color: c.text }]}>{p.name}</Text>
          <View style={s.typeRow}>
            <Ic name={TYPE_ICON[p.type] || 'folder'} s={13} c={c.muted} />
            <Text numberOfLines={1} style={[s.type, { color: c.muted }]}>
              {typeShort}{role ? ' · ' + role : ''}
            </Text>
          </View>
        </View>
        {!!labelName && (
          <View style={[s.label, { borderColor: c.line, backgroundColor: c.surface2 }]}>
            <View style={[s.dot, { backgroundColor: labelColor }]} />
            <Text numberOfLines={1} style={[s.labelTxt, { color: c.text }]}>{labelName}</Text>
          </View>
        )}
      </View>

      <View style={s.stats}>
        <View style={s.stat}>
          <Ic name="users" s={14} c={c.muted} />
          <Text style={[s.statTxt, { color: c.muted }]}>{memberCount}</Text>
        </View>
        <View style={s.stat}>
          <Ic name="tasks" s={14} c={c.muted} />
          <Text style={[s.statTxt, { color: c.muted }]}>{h.done}/{h.total} {t('projects.tasks')}</Text>
        </View>
        {!!p.deadline && (
          <View style={s.stat}>
            <Ic name="calendar" s={14} c={c.muted} />
            <Text style={[s.statTxt, { color: c.muted }]}>{formatDue(p.deadline)}</Text>
          </View>
        )}
        {p.status === 'done' && <Pill label={t('projects.done')} tone="ok" />}
      </View>

      <View style={s.prog}>
        <ProgressBar
          value={h.done}
          total={h.total}
          color={barColor}
          accessibilityLabel={`${h.pct} %`}
          style={s.bar}
        />
        <Text style={[s.pct, { color: barColor }]}>{h.pct} %</Text>
      </View>
    </Pressable>
  )
}

export const ProjectCard = memo(ProjectCardBase)

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titles: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  type: { fontSize: 12.5, flexShrink: 1 },
  label: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.pill, borderWidth: 1, maxWidth: 128,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  labelTxt: { fontSize: 11.5, fontWeight: '700', flexShrink: 1 },
  stats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statTxt: { fontSize: 12.5, fontWeight: '600' },
  prog: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1 },
  pct: { fontSize: 12.5, fontWeight: '800', minWidth: 40, textAlign: 'right' },
})
