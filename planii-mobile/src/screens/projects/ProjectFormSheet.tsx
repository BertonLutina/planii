import { useEffect, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Avatar, Banner, Button, Ic, Sheet } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api, apiUpload, mediaUrl } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import type { ProjectLabel, ProjectSummary, ProjectType } from '@/lib/types'
import { toastAfterSheet, toastErrAfterSheet } from '@/screens/profile/sheetToast'
import { useTheme } from '@/theme/ThemeProvider'
import { ChoiceRow } from './ChoiceRow'
import { DateTimeField } from './DateTimeFields'

/* Création / édition d'un projet — portage du `NewProject` de
   `planii-vite/src/components/Projects.tsx`. Feuille, pas de page : le
   formulaire tient en un écran et l'utilisateur ne perd pas sa liste.
   La photothèque demande son autorisation au moment du geste ; un refus
   n'empêche jamais la création. */

interface Draft { name: string; type: ProjectType; deadline: string; labelId: string }

const TYPE_ITEMS = (): { key: ProjectType; label: string }[] => ([
  { key: 'solo', label: t('proj.optSolo') },
  { key: 'team', label: t('proj.optTeam') },
  { key: 'group', label: t('proj.optGroup') },
])

/** Photo choisie mais pas encore envoyée. */
interface Picked { uri: string; name: string; mimeType: string }

function usePickedImage() {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [denied, setDenied] = useState(false)

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setDenied(true); return }
    setDenied(false)
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    })
    const a = res.canceled ? null : res.assets[0]
    if (a) setPicked({ uri: a.uri, name: a.fileName ?? 'projet.jpg', mimeType: a.mimeType ?? 'image/jpeg' })
  }

  return { picked, setPicked, denied, pick }
}

function PhotoRow({
  name, src, picked, denied, onPick, onClear, busy,
}: {
  name: string
  src: string | null
  picked: Picked | null
  denied: boolean
  onPick: () => void
  onClear: () => void
  busy: boolean
}) {
  const { c } = useTheme()
  return (
    <View style={s.block}>
      <Text style={[s.label, { color: c.muted }]}>{t('pd.projectPhoto')}</Text>
      <View style={s.photoRow}>
        <Pressable
          onPress={onPick}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePhoto')}
          style={s.avatarWrap}
        >
          <Avatar name={name || 'P'} size={56} src={picked?.uri ?? src} />
          <View style={[s.badge, { backgroundColor: c.accent, borderColor: c.surface }]}>
            <Ic name="camera" s={12} c={c.onAccent} strokeWidth={2.1} />
          </View>
        </Pressable>
        <View style={s.photoBtns}>
          <Button label={t('profile.changePhoto')} icon="image" size="sm" disabled={busy} onPress={onPick} />
          {(!!picked || !!src) && (
            <Button label={t('profile.removePhoto')} icon="trash" size="sm" variant="ghost" disabled={busy} onPress={onClear} />
          )}
        </View>
      </View>
      {denied && (
        <Banner tone="warn" icon="lock" style={s.denied}>
          <Text style={[s.deniedTxt, { color: c.warnOn }]}>
            Planii n’a pas accès à tes photos. Autorise-le dans les réglages pour illustrer ce projet — tu peux le créer sans image.
          </Text>
          <Button label="Ouvrir les réglages" size="sm" variant="ghost" onPress={() => { Linking.openSettings().catch(() => { /* ignore */ }) }} style={s.deniedBtn} />
        </Banner>
      )}
    </View>
  )
}

function LabelPicker({ labels, value, onChange }: { labels: ProjectLabel[]; value: string; onChange: (v: string) => void }) {
  const { c } = useTheme()
  return (
    <View style={s.block}>
      <Text style={[s.label, { color: c.muted }]}>{t('proj.labelList')}</Text>
      <View style={s.labelRow}>
        {labels.map((l) => {
          const on = l.id === value
          return (
            <Pressable
              key={l.id}
              onPress={() => onChange(l.id)}
              accessibilityRole="button"
              accessibilityLabel={trTerm(l.label)}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                s.labelChip,
                {
                  backgroundColor: on ? c.accentBg : pressed ? c.surface2 : c.bg,
                  borderColor: on ? c.accent : c.lineStrong,
                  borderWidth: on ? 1.5 : 1,
                },
              ]}
            >
              {/* Couleur du libellé : donnée serveur, portée par une pastille — jamais par du texte. */}
              <View style={[s.labelDot, { backgroundColor: l.color }]} />
              <Text numberOfLines={1} style={[s.labelTxt, { color: on ? c.accentOn : c.text }]}>{trTerm(l.label)}</Text>
              {on && <Ic name="check" s={14} c={c.accent} strokeWidth={2.3} />}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/* ── Création ─────────────────────────────────────────────────────────── */

export interface NewProjectSheetProps {
  open: boolean
  onClose: () => void
  labels: ProjectLabel[]
  /** Appelé avec l'id créé, après fermeture de la feuille. */
  onCreated: (id: string) => void
}

export function NewProjectSheet({ open, onClose, labels, onCreated }: NewProjectSheetProps) {
  useI18n()
  const defaultLabel = labels.find((l) => l.label.toLowerCase() === 'travail') || labels[0]
  const [f, setF] = useState<Draft>({ name: '', type: 'solo', deadline: '', labelId: defaultLabel?.id || '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { picked, setPicked, denied, pick } = usePickedImage()

  useEffect(() => {
    if (!open) { setF({ name: '', type: 'solo', deadline: '', labelId: defaultLabel?.id || '' }); setErr(null); setBusy(false); setPicked(null); return }
    if (!f.labelId && defaultLabel) setF((x) => ({ ...x, labelId: defaultLabel.id }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultLabel?.id])

  async function create() {
    if (!f.name.trim()) { setErr(t('pd.nameEmpty')); return }
    setErr(null)
    setBusy(true)
    try {
      const r = await api<{ project: { id: string } }>('POST', '/projects', {
        name: f.name.trim(), type: f.type, deadline: f.deadline || null, labelId: f.labelId || null,
      })
      let imgErr: string | null = null
      if (picked) {
        try { await apiUpload('/projects/' + r.project.id + '/image', picked) }
        catch (e) { imgErr = (e as Error).message }
      }
      onClose()
      if (imgErr) toastErrAfterSheet(imgErr)
      else toastAfterSheet(t('proj.created'))
      onCreated(r.project.id)
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet((e as Error).message)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('projects.newProject')}
      actions={
        <>
          <Button label={t('action.create')} variant="primary" loading={busy} onPress={create} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />
        </>
      }
    >
      <PhotoRow
        name={f.name}
        src={null}
        picked={picked}
        denied={denied}
        onPick={pick}
        onClear={() => setPicked(null)}
        busy={busy}
      />
      <MicField
        label={t('proj.name')}
        value={f.name}
        onChangeText={(v) => setF({ ...f, name: v })}
        placeholder="Ex. Site web — Café du Coin"
        error={err}
        returnKeyType="done"
      />
      <ChoiceRow
        label={t('proj.type')}
        items={TYPE_ITEMS()}
        value={f.type}
        onChange={(v) => setF({ ...f, type: v })}
      />
      {labels.length > 0 && <LabelPicker labels={labels} value={f.labelId} onChange={(v) => setF({ ...f, labelId: v })} />}
      <DateTimeField
        label={t('proj.deadline')}
        value={f.deadline}
        onChange={(v) => setF({ ...f, deadline: v })}
        clearable
        placeholder={t('vw.none')}
      />
    </Sheet>
  )
}

/* ── Édition (propriétaire uniquement) ────────────────────────────────── */

export interface EditProjectSheetProps {
  open: boolean
  onClose: () => void
  project: ProjectSummary | null
  labels: ProjectLabel[]
  /** Rechargement de la liste après enregistrement. */
  onSaved: () => void
}

export function EditProjectSheet({ open, onClose, project, labels, onSaved }: EditProjectSheetProps) {
  useI18n()
  const [f, setF] = useState<Draft>({ name: '', type: 'solo', deadline: '', labelId: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [removeImg, setRemoveImg] = useState(false)
  const { picked, setPicked, denied, pick } = usePickedImage()

  useEffect(() => {
    if (!open || !project) return
    setF({
      name: project.name,
      type: project.type,
      deadline: project.deadline ? String(project.deadline).slice(0, 10) : '',
      labelId: project.labelId || labels[0]?.id || '',
    })
    setErr(null); setBusy(false); setPicked(null); setRemoveImg(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id])

  async function save() {
    if (!project) return
    if (!f.name.trim()) { setErr(t('pd.nameEmpty')); return }
    setErr(null)
    setBusy(true)
    try {
      await api('PATCH', '/projects/' + project.id, {
        name: f.name.trim(), deadline: f.deadline || null, labelId: f.labelId || null,
      })
      if (picked) await apiUpload('/projects/' + project.id + '/image', picked)
      else if (removeImg && project.imageUrl) await api('DELETE', '/projects/' + project.id + '/image')
      onClose()
      toastAfterSheet(t('pd.projUpd'))
      onSaved()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet((e as Error).message)
    }
  }

  const src = removeImg ? null : mediaUrl(project?.imageUrl)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('action.edit')}
      actions={
        <>
          <Button label={t('action.save')} variant="primary" loading={busy} onPress={save} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />
        </>
      }
    >
      <PhotoRow
        name={f.name}
        src={src}
        picked={picked}
        denied={denied}
        onPick={() => { setRemoveImg(false); pick() }}
        onClear={() => { setPicked(null); setRemoveImg(true) }}
        busy={busy}
      />
      <MicField
        label={t('proj.name')}
        value={f.name}
        onChangeText={(v) => setF({ ...f, name: v })}
        error={err}
        returnKeyType="done"
      />
      {labels.length > 0 && <LabelPicker labels={labels} value={f.labelId} onChange={(v) => setF({ ...f, labelId: v })} />}
      <DateTimeField
        label={t('pd.deadline')}
        value={f.deadline}
        onChange={(v) => setF({ ...f, deadline: v })}
        clearable
        placeholder={t('vw.none')}
      />
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  block: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  badge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  photoBtns: { flex: 1, gap: 8 },
  denied: { marginTop: 12 },
  deniedTxt: { fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  deniedBtn: { marginTop: 10, alignSelf: 'flex-start' },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    minHeight: 44, paddingHorizontal: 12, borderRadius: 12, maxWidth: '100%',
  },
  labelDot: { width: 9, height: 9, borderRadius: 5 },
  labelTxt: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
})
