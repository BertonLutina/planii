import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Field, Ic, SelectBox, Sheet, type SelectOption } from '@/components/ui'
import { MicField, MicTextArea } from '@/components/Mic'
import { api, apiUpload } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { PRIORITIES } from '@/lib/priority'
import { taskTypesOf } from '@/lib/tasktype'
import type { Project, TaskAttachment, TaskAttachmentList, TaskStatus, User } from '@/lib/types'
import { usePv } from '@/theme/ThemeProvider'
import { CheckRow } from '../controls/CheckRow'
import { DateField } from '../controls/DateField'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'

/* Création d'une tâche — feuille du bas « Nouvelle tâche » du prototype mobile validé
   (planii-vite/src/components/NewTaskModal.tsx) : titre, description, photos et fichiers,
   puis responsable, statut, priorité, type, échéance et heures.

   Deux formes dans la même feuille :
     — tâche racine : le formulaire complet ;
     — sous-tâche (`parentId`) : le web n'envoie qu'un titre, on ne demande donc que ça.

   Les fichiers sont envoyés juste après la création (la tâche doit exister pour les recevoir).
   Le titre et la description portent le micro (`MicField`) ; l'assistant vocal guidé vit dans l'onglet. */

export interface NewTaskSheetProps {
  open: boolean
  onClose: () => void
  p: Project
  me: User
  statuses: TaskStatus[]
  /** Statut présélectionné (« Ajouter une tâche » d'une section). */
  presetStatus?: string
  /** Responsable présélectionné (filtre par personne actif). */
  presetAssignee?: string
  /** Crée une sous-tâche de cette tâche (formulaire réduit au titre). */
  parentId?: string | null
  /** Titre du parent — affiché sous le champ. */
  parentTitle?: string
  /** Appelé après création (la feuille est déjà fermée). */
  onCreated: () => void
}

interface Draft {
  title: string
  desc: string
  type: string
  assigneeId: string
  statusKey: string
  due: string
  est: string
  priority: number
  transferable: boolean
}

interface Picked { key: string; uri: string; name: string; mimeType?: string; size?: number; image: boolean }

const fmtSize = (n: number) =>
  n < 1024 ? `${n} o` : n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} Mo`

const blank = (type: string, status?: string, assignee?: string): Draft => ({
  title: '', desc: '', type, assigneeId: assignee ?? '', statusKey: status && status !== 'transferred' ? status : 'todo',
  due: '', est: '', priority: 6, transferable: false,
})

export function NewTaskSheet({
  open, onClose, p, me, statuses, presetStatus, presetAssignee, parentId, parentTitle, onCreated,
}: NewTaskSheetProps) {
  useI18n()
  const pv = usePv()
  const myTypes = taskTypesOf(me)
  const [f, setF] = useState<Draft>(() => blank(myTypes[0] ?? '', presetStatus, presetAssignee))
  const [files, setFiles] = useState<Picked[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [pickErr, setPickErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sub = !!parentId

  /* Une feuille rouverte repart propre, avec les présélections du moment. */
  useEffect(() => {
    if (!open) return
    setF(blank(myTypes[0] ?? '', presetStatus, presetAssignee))
    setFiles([])
    setErr(null)
    setPickErr(null)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function add(list: Omit<Picked, 'key'>[]) {
    setPickErr(null)
    setFiles((l) => [...l, ...list.map((x) => ({ ...x, key: Math.random().toString(36).slice(2) }))])
  }

  async function pickDocument() {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true })
    if (res.canceled) return
    add(res.assets.map((a) => ({
      uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, image: (a.mimeType ?? '').startsWith('image/'),
    })))
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setPickErr(t('files.noPhotos')); return }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 })
    if (res.canceled) return
    add(res.assets.map((a, i) => {
      // La photothèque peut renvoyer un nom sans extension : on en impose une acceptée par le serveur.
      const raw = a.fileName ?? `photo-${Date.now()}-${i}.jpg`
      return {
        uri: a.uri, name: /\.[a-z0-9]+$/i.test(raw) ? raw : raw + '.jpg',
        mimeType: a.mimeType ?? 'image/jpeg', size: a.fileSize, image: true,
      }
    }))
  }

  async function create() {
    if (!f.title.trim()) { setErr(sub ? t('pd.titleReq') : t('pv.titleErr')); return }
    setErr(null)
    setBusy(true)
    const body = sub
      ? { title: f.title.trim(), parentId, priority: 6 }
      : {
        title: f.title.trim(),
        description: f.desc.trim() || null,
        type: f.type || null,
        assigneeId: f.assigneeId || null,
        due: f.due || null,
        estHours: f.est.trim() === '' ? null : Number(f.est.replace(',', '.')),
        priority: f.priority,
        transferable: f.transferable,
        statusKey: f.statusKey !== 'todo' ? f.statusKey : undefined,
      }
    let id = ''
    try {
      const r = await api<{ task: { id: string } }>('POST', '/projects/' + p.id + '/tasks', body)
      id = r.task.id
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
      return
    }

    /* Fichiers : un refus (type, taille, réseau) ne perd pas la tâche, déjà créée. */
    const problems: string[] = []
    if (!sub && files.length) {
      try {
        const info = await api<TaskAttachmentList>('GET', '/tasks/' + id + '/attachments')
        for (const it of files) {
          const ext = it.name.split('.').pop()?.toLowerCase() || ''
          if (!info.accept.includes(ext)) { problems.push(t('files.badType', { n: it.name })); continue }
          if (it.size != null && it.size > info.maxFileBytes) {
            problems.push(t('files.tooBig', { n: it.name, max: fmtSize(info.maxFileBytes) })); continue
          }
          try {
            await apiUpload<{ attachment: TaskAttachment }>('/tasks/' + id + '/attachments', {
              uri: it.uri, name: it.name, mimeType: it.mimeType,
            })
          } catch (e) { problems.push(`${it.name} : ${errMsg(e)}`) }
        }
      } catch (e) { problems.push(errMsg(e)) }
    }

    onClose()
    toastAfterSheet(t('qt.created'))
    if (problems.length) toastErrAfterSheet(problems[0])
    onCreated()
  }

  const statusOpts: SelectOption[] = statuses
    .filter((x) => x.key !== 'transferred')
    .map((x) => ({ value: x.key, label: trTerm(x.label) }))
  const typeOpts: SelectOption[] = [
    { value: '', label: t('vw.none') },
    ...myTypes.map((x) => ({ value: x, label: trTerm(x) })),
  ]
  const assigneeOpts: SelectOption[] = [
    ...p.members.map((m) => ({
      value: m.id,
      label: `${m.name.split(' ')[0]}${m.id === me.id ? ' ' + t('vw.me') : ''}`,
    })),
    { value: '', label: t('pd.toTakeCap') },
  ]
  const prioOpts: SelectOption[] = PRIORITIES.map((n) => ({ value: String(n), label: 'P' + n }))

  return (
    <Sheet
      open={open}
      variant="pv"
      onClose={busy ? () => { /* création en cours */ } : onClose}
      title={sub ? t('pd.mSub') : t('qt.title')}
      actions={
        <>
          <Pressable
            onPress={onClose}
            disabled={busy}
            accessibilityRole="button"
            style={[s.btn, { borderColor: pv.line2, opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={[s.btnTxt, { color: pv.text }]}>{t('action.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={create}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy }}
            style={[s.btn, s.btnAcc, { backgroundColor: pv.acc, borderColor: pv.acc, shadowColor: pv.accShadow, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={[s.btnTxt, { color: pv.onAcc }]}>{busy ? (files.length ? t('pv.filesUp') : t('common.loading')) : t('pv.create')}</Text>
          </Pressable>
        </>
      }
    >
      <MicField
        label={sub ? t('pd.newSub') : t('pv.title')}
        value={f.title}
        onChangeText={(v) => { setF({ ...f, title: v }); setErr(null) }}
        placeholder={sub ? t('pd.newSub') : t('pv.titlePh')}
        error={err}
        hint={sub && parentTitle ? `${t('td.subs')} · ${parentTitle}` : undefined}
        returnKeyType="done"
        onSubmitEditing={create}
      />

      {!sub && (
        <>
          <MicTextArea
            label={t('pv.desc')}
            value={f.desc}
            onChangeText={(v) => setF({ ...f, desc: v })}
            placeholder={t('pv.descPh')}
          />

          {/* Photos et fichiers */}
          <View style={s.fld}>
            <Text style={[s.lbl, { color: pv.muted }]}>{t('pv.photos')}</Text>
            <View style={[s.dz, { borderColor: pv.line2 }]}>
              <Ic name="upload" s={26} c={pv.accFg} />
              <Text style={[s.dzB, { color: pv.text }]}>{t('pv.dzAdd')}</Text>
              <Text style={[s.dzS, { color: pv.muted }]}>{t('pv.dzHint')}</Text>
              <View style={s.dzBtns}>
                <DzBtn icon="image" label={t('pv.photoBtn')} onPress={pickPhoto} />
                <DzBtn icon="paperclip" label={t('pv.fileBtn')} onPress={pickDocument} />
              </View>
            </View>
            {!!pickErr && <Text style={[s.err, { color: pv.dg }]}>{pickErr}</Text>}
            {files.length > 0 && (
              <View style={s.flist}>
                {files.map((it) => (
                  <View key={it.key} style={[s.fitem, { borderColor: pv.line, backgroundColor: pv.raised }]}>
                    <View style={[s.fth, { backgroundColor: pv.accBg }]}>
                      {it.image
                        ? <Image source={{ uri: it.uri }} style={s.fimg} contentFit="cover" />
                        : <Ic name="file" s={20} c={pv.accFg} />}
                    </View>
                    <View style={s.fn}>
                      <Text numberOfLines={1} style={[s.fname, { color: pv.text }]}>{it.name}</Text>
                      {it.size != null && <Text style={{ color: pv.hint, fontSize: 13 }}>{fmtSize(it.size)}</Text>}
                    </View>
                    {!busy && (
                      <Pressable
                        onPress={() => setFiles((l) => l.filter((x) => x.key !== it.key))}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('pv.removeFile', { n: it.name })}
                        style={s.ib}
                      >
                        <Ic name="x" s={16} c={pv.hint} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          <SelectBox
            label={t('td.assignee')}
            value={f.assigneeId}
            options={assigneeOpts}
            onChange={(v) => setF({ ...f, assigneeId: v })}
          />
          <SelectBox
            label={t('meet.status')}
            value={f.statusKey}
            options={statusOpts}
            onChange={(v) => setF({ ...f, statusKey: v })}
          />
          <SelectBox
            label={t('td.priority')}
            value={String(f.priority)}
            options={prioOpts}
            onChange={(v) => setF({ ...f, priority: Number(v) })}
          />
          <SelectBox
            label={t('qt.type')}
            value={f.type}
            options={typeOpts}
            onChange={(v) => setF({ ...f, type: v })}
          />
          <DateField label={t('td.due')} value={f.due} onChange={(v) => setF({ ...f, due: v })} placeholder={t('vw.noneF')} />
          <Field
            label={t('pd.estH')}
            value={f.est}
            onChangeText={(v) => setF({ ...f, est: v })}
            placeholder="3"
            keyboardType="decimal-pad"
          />
          <CheckRow
            label={t('meet.transferable')}
            checked={f.transferable}
            onPress={() => setF({ ...f, transferable: !f.transferable })}
            style={s.check}
          />
        </>
      )}
    </Sheet>
  )
}

function DzBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const pv = usePv()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.dzBtn, { borderColor: pv.line2, backgroundColor: pressed ? pv.accBg : pv.raised }]}
    >
      <Ic name={icon} s={16} c={pv.accFg} />
      <Text style={{ color: pv.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  fld: { marginBottom: 20 },
  lbl: { fontSize: 13.5, fontWeight: '700', marginBottom: 8 },
  err: { fontSize: 13.5, fontWeight: '600', marginTop: 6 },
  dz: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', gap: 4 },
  dzB: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  dzS: { fontSize: 13.5, textAlign: 'center' },
  dzBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dzBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  flist: { gap: 8, marginTop: 10 },
  fitem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderWidth: 1, borderRadius: 14 },
  fth: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fimg: { width: 46, height: 46 },
  fn: { flex: 1, minWidth: 0 },
  fname: { fontSize: 14.5, fontWeight: '700' },
  ib: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  check: { marginBottom: 14 },
  btn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnAcc: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 11, elevation: 6 },
  btnTxt: { fontSize: 14, fontWeight: '700' },
})
