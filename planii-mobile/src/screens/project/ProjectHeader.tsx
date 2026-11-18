import { Image } from 'expo-image'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ic } from '@/components/ui'
import { mediaUrl } from '@/lib/api'
import { TYPE_LABEL, formatDue, initials, parseISO, todayMid } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { projectPoints } from '@/lib/points'
import type { Project } from '@/lib/types'
import { usePv } from '@/theme/ThemeProvider'

/** En-tête compact du projet (`.pv-head` du prototype mobile) : image, nom, type · points ·
 *  livraison (pastille rouge si en retard), barre de progression, puis les actions du projet.
 *  Les réglages rares (modifier, supprimer, statuts) restent dans le menu du bandeau natif. */
export function ProjectHeader({ p, compact = false, onMeet, onClose, onReopen }: {
  p: Project
  /** Autres onglets : titre et barre seulement, sans les actions (l'en-tête complet défile avec les tâches). */
  compact?: boolean
  onMeet?: () => void
  onClose?: () => void
  onReopen?: () => void
}) {
  const pv = usePv()
  const done = p.doneCount ?? p.tasks.filter((x) => x.done).length
  const total = p.taskCount ?? p.tasks.length
  const closed = p.status === 'done'
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0
  const d = parseISO(p.deadline || null)
  const late = !!d && d < todayMid() && !closed
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)

  return (
    <View style={[s.wrap, compact && s.wrapFixed]}>
      <View style={s.row}>
        <View style={[s.logo, { backgroundColor: pv.acc }]}>
          {p.imageUrl
            ? <Image source={{ uri: mediaUrl(p.imageUrl) || '' }} style={s.logoImg} contentFit="cover" />
            : <Text style={s.logoTxt}>{initials(p.name)}</Text>}
        </View>
        <View style={s.body}>
          <Text accessibilityRole="header" numberOfLines={2} style={[s.name, { color: pv.text }]}>{p.name}</Text>
          <View style={s.meta}>
            <View style={[s.chip, { backgroundColor: pv.raised, borderColor: pv.line }]}>
              <Text style={[s.chipTxt, { color: pv.muted }]}>{TYPE_LABEL[p.type]}</Text>
            </View>
            <Text style={[s.pts, { color: pv.muted }]}>{projectPoints(p)} pts</Text>
            {!!p.deadline && (
              <View
                style={[s.chip, late ? { backgroundColor: pv.dgBg, borderColor: 'transparent' } : { backgroundColor: pv.raised, borderColor: pv.line }]}
                accessibilityLabel={`${cap(t('pd.delivery'))} ${formatDue(p.deadline)}${late ? ' — ' + t('today.overdue') : ''}`}
              >
                {late && <Ic name="alert" s={14} c={pv.dg} />}
                <Text style={[s.chipTxt, { color: late ? pv.dg : pv.muted }]}>{cap(t('pd.delivery'))} {formatDue(p.deadline)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View
        style={s.bar}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${done} ${t('projects.tasks')} / ${total}`}
        accessibilityValue={{ min: 0, max: Math.max(total, 1), now: done, text: `${pct} %` }}
      >
        <View style={[s.track, { backgroundColor: pv.line2 }]}>
          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: pv.acc, borderRadius: 4 }} />
        </View>
        <Text style={[s.barTxt, { color: pv.text }]}>{done}/{total}</Text>
      </View>

      {!compact && (!closed || (closed && !!onReopen)) && (
        <View style={s.pact}>
          {!closed && !!onMeet && (
            <Btn acc icon="video" label={t('meet.title')} onPress={onMeet} />
          )}
          {!closed && !!onClose && <Btn icon="check" label={t('pd.close')} onPress={onClose} />}
          {closed && !!onReopen && <Btn acc label={t('pd.reopen')} onPress={onReopen} />}
        </View>
      )}
    </View>
  )
}

function Btn({ label, icon, acc = false, onPress }: { label: string; icon?: string; acc?: boolean; onPress: () => void }) {
  const pv = usePv()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        acc
          ? { backgroundColor: pv.acc, borderColor: pv.acc, shadowColor: pv.accShadow, ...s.btnAcc }
          : { backgroundColor: pv.raised, borderColor: pv.line2 },
        pressed && { opacity: 0.88 },
      ]}
    >
      {!!icon && <Ic name={icon} s={18} c={acc ? pv.onAcc : pv.text} />}
      <Text style={[s.btnTxt, { color: acc ? pv.onAcc : pv.text }]}>{label}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  /* Dans la liste des tâches, la gouttière de 20 pt vient de la liste ; en version fixe (autres onglets) elle est propre. */
  wrap: { paddingTop: 4, gap: 12 },
  wrapFixed: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 46, height: 46 },
  logoTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.66, lineHeight: 24 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1 },
  chipTxt: { fontSize: 13, fontWeight: '600' },
  pts: { fontSize: 13, fontWeight: '500' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barTxt: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pact: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 12, borderWidth: 1 },
  btnAcc: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 11, elevation: 6 },
  btnTxt: { fontSize: 14, fontWeight: '700' },
})
