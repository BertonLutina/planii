import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Confirm, EmptyState, Ic } from '@/components/ui'
import { api } from '@/lib/api'
import { canManage, MONTHS, parseISO } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import type { Appointment, Project, User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'
import { AppointmentSheet } from './AppointmentSheet'

/* Onglet « Rendez-vous » — portage de `AppointmentsTab`.
   Le web loge ça dans un onglet à part du projet ; on garde le même découpage,
   les rendez-vous n'ayant rien à voir avec les tâches ni avec l'équipe. */

export interface AppointmentsTabProps {
  p: Project
  me: User
  reload: () => void
}

const prettyDate = (v: string): string => {
  const d = parseISO(v)
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : v
}

export function AppointmentsTab({ p, me, reload }: AppointmentsTabProps) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  useI18n()

  const [editing, setEditing] = useState<Appointment | null>(null)
  const [creating, setCreating] = useState(false)
  const [delFor, setDelFor] = useState<Appointment | null>(null)
  const [busy, setBusy] = useState(false)

  const closed = p.status === 'done'
  const manage = canManage(p.my_role)
  const canEdit = (a: Appointment) => !closed && (a.createdBy === me.id || manage)

  const items = useMemo(
    () => [...(p.appointments ?? [])].sort((a, b) => (a.date + a.timeStart).localeCompare(b.date + b.timeStart)),
    [p.appointments],
  )

  async function remove() {
    const a = delFor
    if (!a) return
    setBusy(true)
    try {
      await api('DELETE', '/appointments/' + a.id)
      setBusy(false)
      setDelFor(null)
      toastAfterSheet(t('pd.apptDel'))
      reload()
    } catch (e) {
      setBusy(false)
      setDelFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }

  return (
    <View style={s.fill}>
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={
          closed
            ? null
            : <Button label={t('qa.title')} icon="plus" variant="primary" block onPress={() => setCreating(true)} style={s.new} />
        }
        /* Pas d'action ici : le bouton principal est juste au-dessus, la
           répéter ferait deux boutons accent dans le même écran. */
        ListEmptyComponent={
          <EmptyState icon="calendar" title={t('pd.noAppt')} message={closed ? t('pd.closedX') : undefined} />
        }
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: a }) => (
          <View style={[s.card, { borderColor: c.line, backgroundColor: c.surface }]}>
            <Text numberOfLines={2} style={[s.title, { color: c.text }]}>{a.title}</Text>
            <View style={s.when}>
              <Ic name="calendar" s={14} c={c.muted} />
              <Text style={[s.sub, { color: c.muted }]}>
                {prettyDate(a.date)} · {a.timeStart} – {a.timeEnd}
              </Text>
            </View>
            {!!a.description && <Text style={[s.desc, { color: c.muted }]}>{a.description}</Text>}
            <Text style={[s.sub, { color: c.muted }]}>
              {t('pd.parts2')} {a.participants.length ? a.participants.map((x) => x.name).join(', ') : '—'}
            </Text>
            {canEdit(a) && (
              <View style={s.btns}>
                <Button label={t('action.edit')} icon="edit" size="sm" onPress={() => setEditing(a)} />
                <Button label={t('action.delete')} icon="trash" size="sm" variant="danger" onPress={() => setDelFor(a)} />
              </View>
            )}
          </View>
        )}
      />

      <AppointmentSheet
        open={creating}
        onClose={() => setCreating(false)}
        p={p}
        me={me}
        onSaved={reload}
      />
      <AppointmentSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        p={p}
        me={me}
        initial={editing}
        onSaved={reload}
      />

      {/* Suppression — même conséquence annoncée que sur le web. */}
      <Confirm
        open={!!delFor}
        onClose={() => setDelFor(null)}
        title={delFor ? `${t('action.delete')} « ${delFor.title} » ?` : t('action.delete')}
        message={delFor ? `${t('qa.appt')} « ${delFor.title} » — ${t('pd.irrev')}` : undefined}
        confirmLabel={t('pd.yesDel')}
        tone="danger"
        loading={busy}
        onConfirm={remove}
      />
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: 18, paddingTop: 12 },
  new: { marginBottom: 14 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: 14, marginBottom: 10, gap: 7 },
  title: { fontSize: 15.5, fontWeight: '700', lineHeight: 21 },
  when: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sub: { fontSize: 12.5, lineHeight: 18, flexShrink: 1 },
  desc: { fontSize: 13.5, lineHeight: 19 },
  btns: { flexDirection: 'row', gap: 8, marginTop: 3 },
})
