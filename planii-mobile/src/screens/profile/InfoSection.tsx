import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Banner, Button, Card, SectionHeader, Sheet } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { toastAfterSheet } from './sheetToast'

/* Mes informations — portage de la carte `.info-card` et de `EditInfoModal`
   (planii-vite/src/App.tsx). L'e-mail reste en lecture seule, comme sur le web. */

export function InfoSection({ me }: { me: User }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <SectionHeader title={t('profile.info')} actionLabel={t('action.edit')} onAction={() => setOpen(true)} />
      <Card padded={false}>
        <Row label={t('profile.firstName')} value={me.firstName} first />
        <Row label={t('profile.lastName')} value={me.lastName} />
        <Row label={t('profile.job')} value={me.job} />
        <Row label={t('profile.email')} value={me.email} />
      </Card>
      <EditInfoSheet me={me} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function Row({ label, value, first }: { label: string; value?: string | null; first?: boolean }) {
  const { c } = useTheme()
  return (
    <View style={[s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
      <Text style={[s.k, { color: c.muted }]}>{label}</Text>
      <Text numberOfLines={1} style={[s.v, { color: value ? c.text : c.hint }]}>{value || '—'}</Text>
    </View>
  )
}

function EditInfoSheet({ me, open, onClose }: { me: User; open: boolean; onClose: () => void }) {
  const { update } = useSession()
  const [first, setFirst] = useState(me.firstName || '')
  const [last, setLast] = useState(me.lastName || '')
  const [job, setJob] = useState(me.job || '')
  const [err, setErr] = useState<string | null>(null)
  const [srvErr, setSrvErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  /* Rouvrir la feuille repart des valeurs enregistrées, jamais d'une saisie
     abandonnée à l'ouverture précédente. */
  useEffect(() => {
    if (!open) return
    setFirst(me.firstName || ''); setLast(me.lastName || ''); setJob(me.job || '')
    setErr(null); setSrvErr(null)
  }, [open, me.firstName, me.lastName, me.job])

  const close = () => { setErr(null); setSrvErr(null); onClose() }

  async function save() {
    if (saving) return
    if (!first.trim() && !last.trim()) { setErr('Indique au moins un prénom ou un nom'); return }
    setErr(null); setSrvErr(null); setSaving(true)
    try {
      const r = await api<{ user: User }>('PATCH', '/me', {
        firstName: first.trim(), lastName: last.trim(), job: job.trim(),
      })
      update(r.user)
      onClose()
      toastAfterSheet('Profil mis à jour ✓')
    } catch (e) {
      setSrvErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('profile.editInfo')}
      actions={
        <>
          <Button
            label={saving ? t('action.saving') : t('action.save')}
            variant="primary"
            loading={saving}
            onPress={save}
            style={s.grow}
          />
          <Button label={t('action.cancel')} variant="ghost" onPress={close} style={s.grow} />
        </>
      }
    >
      {!!srvErr && <Banner tone="danger" icon="alert" text={srvErr} style={s.banner} />}
      <MicField
        label={t('profile.firstName')}
        value={first}
        onChangeText={(v) => { setFirst(v); if (err) setErr(null) }}
        placeholder={t('profile.phFirst')}
        error={err}
        maxLength={60}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="done"
      />
      <MicField
        label={t('profile.lastName')}
        value={last}
        onChangeText={setLast}
        placeholder={t('profile.phLast')}
        maxLength={60}
        autoCapitalize="words"
        autoComplete="off"
        returnKeyType="done"
      />
      <MicField
        label={t('profile.job')}
        value={job}
        onChangeText={setJob}
        placeholder={t('profile.phJob')}
        maxLength={60}
        returnKeyType="done"
      />
    </Sheet>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 16, paddingVertical: 11 },
  k: { fontSize: 13, fontWeight: '600' },
  v: { flex: 1, fontSize: 14.5, textAlign: 'right' },
  grow: { flex: 1 },
  banner: { marginBottom: 12 },
})
