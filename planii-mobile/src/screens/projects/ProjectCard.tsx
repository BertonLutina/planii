import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ic } from '@/components/ui'
import { mediaUrl } from '@/lib/api'
import { ROLE_LABEL, formatDue, initials, parseISO, todayMid } from '@/lib/dates'
import { t, trTerm } from '@/lib/i18n'
import type { ProjectSummary } from '@/lib/types'
import { health } from '@/lib/ui'
import { alpha, mix } from '@/screens/project/pv/colors'
import { PvAvatar } from '@/screens/project/pv/PvBits'
import { usePv } from '@/theme/ThemeProvider'

/* Carte de projet — version mobile de la page Projets validée (planii-vite, `.pj-card`) :
   icône teintée par le libellé, étiquette, échéance (pastille rouge si dépassée),
   avancement en grand, puis l'équipe : photos (ou initiales), trois au plus, puis « +N ».
   Appui = ouvrir le projet, appui long = menu d'actions (ordre, édition, suppression). */

const typeShortOf = (type: string) =>
  t('proj.type' + type.charAt(0).toUpperCase() + type.slice(1)) || type

export interface ProjectCardProps {
  p: ProjectSummary
  onOpen: () => void
  onMenu: () => void
}

function ProjectCardBase({ p, onOpen, onMenu }: ProjectCardProps) {
  const pv = usePv()
  const h = health(p.taskCount, p.doneCount, p.status)
  const done = p.status === 'done'
  const full = done || h.pct === 100
  const memberCount = Number.isFinite(Number(p.memberCount)) ? Number(p.memberCount) : 1
  const role = p.type !== 'group' ? (ROLE_LABEL[p.my_role] || p.my_role) : ''
  const typeShort = typeShortOf(p.type)
  /* Couleur du libellé : donnée serveur (contenu). Elle teinte l'icône et la pastille. */
  const color = p.labelColor || pv.acc
  const labelName = p.labelName ? trTerm(p.labelName) : null
  const dl = parseISO(p.deadline || null)
  const late = !!dl && dl < todayMid() && !done
  const preview = p.memberPreview ?? []
  const barColor = full ? pv.ok : pv.acc

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
        { backgroundColor: pv.surface, borderColor: pressed ? pv.line2 : pv.line, shadowColor: '#1e145a' },
      ]}
    >
      <View style={s.head}>
        <View style={[s.logo, { backgroundColor: alpha(color, 0.18) }]}>
          {p.imageUrl
            ? <Image source={{ uri: mediaUrl(p.imageUrl) || '' }} style={s.logoImg} contentFit="cover" />
            : <Text style={[s.logoTxt, { color: mix(color, pv.text, 62) }]}>{initials(p.name)}</Text>}
        </View>
        <View style={s.titles}>
          <Text numberOfLines={1} style={[s.name, { color: pv.text }]}>{p.name}</Text>
          <View style={s.typeRow}>
            <Ic name={p.type === 'solo' ? 'user' : 'users'} s={13} c={pv.hint} />
            <Text numberOfLines={1} style={[s.type, { color: pv.hint }]}>{typeShort}{role ? ' · ' + role : ''}</Text>
          </View>
        </View>
      </View>

      <View style={s.mid}>
        {!!labelName && (
          <View style={[s.pill, { backgroundColor: alpha(color, 0.14) }]}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text numberOfLines={1} style={[s.pillTxt, { color: mix(color, pv.text, 60) }]}>{labelName}</Text>
          </View>
        )}
        {late && (
          <View style={[s.pill, { backgroundColor: pv.dgBg }]}>
            <Ic name="alert" s={13} c={pv.dg} />
            <Text style={[s.pillTxt, { color: pv.dg }]}>{formatDue(p.deadline)}</Text>
          </View>
        )}
        {!late && !done && !!p.deadline && (
          <View style={s.due}>
            <Ic name="calendar" s={14} c={pv.muted} />
            <Text style={[s.dueTxt, { color: pv.muted }]}>{formatDue(p.deadline)}</Text>
          </View>
        )}
        {done && (
          <View style={s.due}>
            <Ic name="circle-check" s={14} c={pv.ok} />
            <Text style={[s.dueTxt, { color: pv.ok }]}>{t('projects.done')}</Text>
          </View>
        )}
      </View>

      <View>
        <View style={s.nums}>
          <Text style={[s.numsTxt, { color: pv.muted }]}>{h.done}/{h.total} {t('projects.tasks')}</Text>
          <Text style={[s.pct, { color: pv.text }]}>{h.pct} %</Text>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${h.pct} %`}
          accessibilityValue={{ min: 0, max: Math.max(h.total, 1), now: h.done }}
          style={[s.track, { backgroundColor: pv.line2 }]}
        >
          <View style={{ width: `${Math.min(100, h.pct)}%`, height: '100%', borderRadius: 4, backgroundColor: barColor }} />
        </View>
      </View>

      <View style={s.foot}>
        {preview.length > 0
          ? (
            <View style={s.stack}>
              {preview.slice(0, 3).map((m, i) => (
                <PvAvatar
                  key={m.id}
                  name={m.name}
                  src={mediaUrl(m.avatarUrl)}
                  size={32}
                  style={[s.stackAv, { borderColor: pv.surface }, i === 0 && { marginLeft: 0 }]}
                />
              ))}
              {memberCount > 3 && (
                <View
                  accessible
                  accessibilityLabel={t('pj.others', { n: memberCount - 3 })}
                  style={[s.more, { backgroundColor: pv.accBg, borderColor: pv.surface }]}
                >
                  <Text style={[s.moreTxt, { color: pv.accFg }]}>+{memberCount - 3}</Text>
                </View>
              )}
            </View>
          )
          : <Ic name="users" s={15} c={pv.hint} />}
        <Text style={[s.members, { color: pv.hint }]}>
          {memberCount === 1 ? t('pj.member1') : t('pj.members', { n: memberCount })}
        </Text>
      </View>
    </Pressable>
  )
}

export const ProjectCard = memo(ProjectCardBase)

const s = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 22, padding: 18, gap: 16,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 2,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 48, height: 48 },
  logoTxt: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  titles: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '800', letterSpacing: -0.34 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  type: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  mid: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 26 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 26, paddingLeft: 9, paddingRight: 11, borderRadius: 13 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pillTxt: { fontSize: 12.5, fontWeight: '700' },
  due: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueTxt: { fontSize: 13, fontWeight: '600' },
  nums: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  numsTxt: { flex: 1, fontSize: 13, fontWeight: '600' },
  pct: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackAv: { marginLeft: -6, borderWidth: 2 },
  more: { minWidth: 32, height: 32, paddingHorizontal: 6, marginLeft: -6, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  moreTxt: { fontSize: 11.5, fontWeight: '800' },
  members: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '600' },
})
