import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Avatar, Banner, Button, Sheet } from '@/components/ui'
import { MicField, MicTextArea } from '@/components/Mic'
import { api } from '@/lib/api'
import { t, useI18n } from '@/lib/i18n'
import type { Appointment, Project, User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { CheckRow } from '../controls/CheckRow'
import { DateField } from '../controls/DateField'
import { TimeField } from '../controls/TimeField'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'

/* Rendez-vous — portage de `AppointmentModal`.
   Les validations du web passaient par des toasts ; ici elles restent en ligne
   (erreur de champ ou bandeau), un toast ne pouvant pas s'afficher sous une
   feuille ouverte. Dates et heures : sélecteurs natifs, jamais de saisie libre. */

export interface AppointmentSheetProps {
  open: boolean
  onClose: () => void
  p: Project
  me: User
  /** Édition si fourni, création sinon. */
  initial?: Appointment | null
  onSaved: () => void
}

interface Form {
  title: string
  description: string
  date: string
  timeStart: string
  timeEnd: string
  participants: string[]
}

export function AppointmentSheet({ open, onClose, p, me, initial, onSaved }: AppointmentSheetProps) {
  const { c } = useTheme()
  useI18n()
  const [f, setF] = useState<Form>({
    title: '', description: '', date: '', timeStart: '09:00', timeEnd: '10:00', participants: [me.id],
  })
  const [err, setErr] = useState<Partial<Record<'title' | 'date' | 'slot' | 'parts', string>>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setF({
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      date: initial?.date ? String(initial.date).slice(0, 10) : '',
      timeStart: initial?.timeStart ?? '09:00',
      timeEnd: initial?.timeEnd ?? '10:00',
      participants: initial?.participants.map((x) => x.id) ?? [me.id],
    })
    setErr({})
    setBusy(false)
  }, [open, initial, me.id])

  const toggle = (id: string) => setF((v) => ({
    ...v,
    participants: v.participants.includes(id) ? v.participants.filter((x) => x !== id) : [...v.participants, id],
  }))

  async function save() {
    const next: typeof err = {}
    if (!f.title.trim()) next.title = t('pd.titleReq')
    if (!f.date) next.date = t('pd.dateReq')
    if (!f.timeStart || !f.timeEnd) next.slot = t('pd.slotReq')
    else if (f.timeStart >= f.timeEnd) next.slot = t('pd.endAfter')
    if (!f.participants.length) next.parts = t('pd.needPart')
    setErr(next)
    if (Object.keys(next).length) return

    setBusy(true)
    const body = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      date: f.date,
      timeStart: f.timeStart,
      timeEnd: f.timeEnd,
      participantIds: f.participants,
    }
    try {
      if (initial) await api('PATCH', '/appointments/' + initial.id, body)
      else await api('POST', '/projects/' + p.id + '/appointments', body)
      onClose()
      toastAfterSheet(initial ? t('pd.apptUpd') : t('pd.apptMade'))
      onSaved()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* enregistrement en cours */ } : onClose}
      title={initial ? t('action.edit') : t('qa.title')}
      actions={
        <>
          <Button
            label={initial ? t('action.save') : t('pd.createAppt')}
            variant="primary"
            loading={busy}
            onPress={save}
            style={s.grow}
          />
          <Button label={t('action.cancel')} variant="ghost" disabled={busy} onPress={onClose} style={s.grow} />
        </>
      }
    >
      <MicField
        label={t('qt.label')}
        value={f.title}
        onChangeText={(v) => setF({ ...f, title: v })}
        placeholder="Ex. Point d’équipe hebdomadaire"
        error={err.title}
        returnKeyType="done"
      />
      <MicTextArea
        label={t('pd.desc')}
        value={f.description}
        onChangeText={(v) => setF({ ...f, description: v })}
        placeholder="Ordre du jour, lieu, lien visio…"
      />
      <DateField
        label={t('qa.date')}
        value={f.date}
        onChange={(v) => setF({ ...f, date: v })}
        error={err.date}
        clearable={false}
      />
      <Text style={[s.label, { color: c.muted }]}>{t('pd.slot')}</Text>
      <View style={s.slot}>
        <TimeField label={t('qa.start')} value={f.timeStart} onChange={(v) => setF({ ...f, timeStart: v })} />
        <TimeField label={t('qa.end')} value={f.timeEnd} onChange={(v) => setF({ ...f, timeEnd: v })} />
      </View>
      {!!err.slot && <Banner tone="danger" icon="alert" text={err.slot} style={s.slotErr} />}

      <Text style={[s.label, { color: c.muted }]}>{t('pd.parts')}</Text>
      <Text style={[s.hint, { color: c.hint }]}>{t('pd.pickParts')}</Text>
      {p.members.map((m) => (
        <CheckRow
          key={m.id}
          label={m.id === me.id ? `${m.name} ${t('vw.me')}` : m.name}
          left={<Avatar name={m.name} size={30} />}
          checked={f.participants.includes(m.id)}
          onPress={() => toggle(m.id)}
        />
      ))}
      {!!err.parts && <Banner tone="danger" icon="alert" text={err.parts} style={s.slotErr} />}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  hint: { fontSize: 12.5, marginBottom: 8 },
  slot: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  slotErr: { marginTop: 4 },
})
