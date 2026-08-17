import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Banner, Button, Card, Chip, SectionHeader, Sheet } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api } from '@/lib/api'
import { t, trTerm } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { typeTone } from '@/lib/tasktype'
import type { User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { toastAfterSheet } from './sheetToast'

/* Listes personnelles (types de tâches, bibliothèque de rôles) — portage de
   `ListEditor` / `ListEditModal` (planii-vite/src/App.tsx).
   Le doublon et la limite de 40 entrées s'affichent sous le champ, pas en
   toast : la feuille masquerait le message. */

const MAX_ITEMS = 40

export interface ListEditorProps {
  me: User
  title: string
  desc: string
  field: 'taskTypes' | 'roleLibrary'
  get: (u: User) => string[]
  placeholder: string
  maxLen: number
  emptyNote: string
}

export function ListEditor(props: ListEditorProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)
  const saved = props.get(props.me)

  return (
    <>
      <SectionHeader title={props.title} actionLabel={t('action.edit')} onAction={() => setOpen(true)} />
      <Card>
        <Text style={[s.desc, { color: c.muted }]}>{props.desc}</Text>
        <View style={s.chips}>
          {saved.map((v) => <Chip key={v} label={trTerm(v)} tone={typeTone(v)} />)}
          {saved.length === 0 && <Text style={[s.empty, { color: c.hint }]}>{props.emptyNote}</Text>}
        </View>
      </Card>
      <ListEditSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function ListEditSheet({
  me, title, field, get, placeholder, maxLen, emptyNote, open, onClose,
}: ListEditorProps & { open: boolean; onClose: () => void }) {
  const { c } = useTheme()
  const { update } = useSession()
  const [list, setList] = useState<string[]>(() => get(me))
  const [nv, setNv] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [srvErr, setSrvErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setList(get(me)); setNv(''); setErr(null); setSrvErr(null)
  }, [open, me, get])

  function add() {
    const v = nv.trim()
    if (!v) return
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) { setErr(t('msg.dup')); return }
    if (list.length >= MAX_ITEMS) { setErr(t('msg.tooLong')); return }
    setList([...list, v]); setNv(''); setErr(null)
  }

  async function save() {
    if (saving) return
    setSrvErr(null); setSaving(true)
    try {
      const r = await api<{ user: User }>('PATCH', '/me', { [field]: list })
      update(r.user)
      onClose()
      toastAfterSheet(t('msg.saved'))
    } catch (e) {
      setSrvErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button
            label={saving ? t('action.saving') : t('action.save')}
            variant="primary"
            loading={saving}
            onPress={save}
            style={s.grow}
          />
          <Button label={t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />
        </>
      }
    >
      {!!srvErr && <Banner tone="danger" icon="alert" text={srvErr} style={s.banner} />}
      <View style={s.chips}>
        {list.map((v) => (
          <Chip
            key={v}
            label={trTerm(v)}
            tone={typeTone(v)}
            onRemove={() => { setList(list.filter((x) => x !== v)); setErr(null) }}
          />
        ))}
        {list.length === 0 && <Text style={[s.empty, { color: c.hint }]}>{emptyNote}</Text>}
      </View>
      <View style={s.addRow}>
        <MicField
          value={nv}
          onChangeText={(v) => { setNv(v); if (err) setErr(null) }}
          placeholder={placeholder}
          error={err}
          maxLength={maxLen}
          returnKeyType="done"
          onSubmitEditing={add}
          style={s.grow}
        />
        <Button label={t('action.add')} icon="plus" size="sm" onPress={add} style={s.addBtn} />
      </View>
    </Sheet>
  )
}

const s = StyleSheet.create({
  desc: { fontSize: 13.5, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  empty: { fontSize: 13.5, lineHeight: 19 },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  addBtn: { marginTop: 4 },
  grow: { flex: 1 },
  banner: { marginBottom: 12 },
})
