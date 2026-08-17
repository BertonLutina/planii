import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Field, Sheet } from '@/components/ui'
import { MicField, MicTextArea } from '@/components/Mic'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { PRIORITIES } from '@/lib/priority'
import { taskTypesOf, typeTone } from '@/lib/tasktype'
import type { Project, User } from '@/lib/types'
import { prioTone } from '@/screens/projects'
import { CheckRow } from '../controls/CheckRow'
import { ChipSelect, type ChipOption } from '../controls/ChipSelect'
import { DateField } from '../controls/DateField'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'

/* Création d'une tâche — portage du bloc « adding » de `TasksTab`
   (planii-vite/src/components/ProjectDetail.tsx).

   Deux formes dans la même feuille :
     — tâche racine : le formulaire complet du web ;
     — sous-tâche (`parentId`) : le web n'envoie qu'un titre, on ne demande
       donc que ça — un champ unique se remplit d'une main.

   L'intitulé et la description portent le micro (`MicField` / `MicTextArea`),
   comme le `MicInput` du web ; l'assistant vocal guidé vit dans l'onglet. */

export interface NewTaskSheetProps {
  open: boolean
  onClose: () => void
  p: Project
  me: User
  /** Crée une sous-tâche de cette tâche (formulaire réduit au titre). */
  parentId?: string | null
  /** Titre du parent — affiché dans l'en-tête de la feuille. */
  parentTitle?: string
  /** Appelé après création (la feuille est déjà fermée). */
  onCreated: () => void
}

interface Draft {
  title: string
  desc: string
  type: string
  assigneeId: string
  due: string
  est: string
  priority: number
  transferable: boolean
}

const blank = (type: string): Draft => ({
  title: '', desc: '', type, assigneeId: '', due: '', est: '', priority: 6, transferable: false,
})

export function NewTaskSheet({ open, onClose, p, me, parentId, parentTitle, onCreated }: NewTaskSheetProps) {
  useI18n()
  const myTypes = taskTypesOf(me)
  const [f, setF] = useState<Draft>(() => blank(myTypes[0] ?? ''))
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sub = !!parentId

  /* Une feuille rouverte repart propre. */
  useEffect(() => {
    if (open) return
    setF(blank(myTypes[0] ?? ''))
    setErr(null)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function create() {
    if (!f.title.trim()) { setErr(t('pd.titleReq')); return }
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
      }
    try {
      await api('POST', '/projects/' + p.id + '/tasks', body)
      onClose()
      toastAfterSheet(t('qt.created'))
      onCreated()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
    }
  }

  const typeItems: ChipOption<string>[] = [
    { key: '', label: t('vw.none') },
    ...myTypes.map((x) => ({ key: x, label: trTerm(x), tone: typeTone(x) })),
  ]
  const assigneeItems: ChipOption<string>[] = [
    { key: '', label: t('vw.toTakeOpt'), tone: 'warn' },
    ...p.members.map((m) => ({ key: m.id, label: m.id === me.id ? `${m.name} ${t('vw.me')}` : m.name })),
  ]

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* création en cours */ } : onClose}
      title={sub ? t('pd.mSub') : t('qt.title')}
      actions={
        <>
          <Button label={t('action.create')} variant="primary" loading={busy} onPress={create} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" disabled={busy} onPress={onClose} style={s.grow} />
        </>
      }
    >
      <MicField
        label={sub ? t('pd.newSub') : t('qt.label')}
        value={f.title}
        onChangeText={(v) => setF({ ...f, title: v })}
        placeholder={sub ? t('pd.newSub') : 'Ex. Envoyer les visuels'}
        error={err}
        hint={sub && parentTitle ? `${t('td.subs')} · ${parentTitle}` : undefined}
        returnKeyType="done"
        onSubmitEditing={create}
      />

      {!sub && (
        <>
          <MicTextArea
            label={t('pd.descOpt')}
            value={f.desc}
            onChangeText={(v) => setF({ ...f, desc: v })}
            placeholder="Détails, contexte…"
          />
          <ChipSelect label={t('qt.type')} options={typeItems} value={f.type} onChange={(v) => setF({ ...f, type: v })} />
          <ChipSelect
            label={t('td.assignee')}
            options={assigneeItems}
            value={f.assigneeId}
            onChange={(v) => setF({ ...f, assigneeId: v })}
          />
          <DateField label={t('qt.due')} value={f.due} onChange={(v) => setF({ ...f, due: v })} placeholder={t('vw.noneF')} />
          <ChipSelect
            label={t('td.priority')}
            options={PRIORITIES.map((n) => ({ key: String(n), label: 'P' + n, tone: prioTone(n) }))}
            value={String(f.priority)}
            onChange={(v) => setF({ ...f, priority: Number(v) })}
          />
          <CheckRow
            label={t('meet.transferable')}
            checked={f.transferable}
            onPress={() => setF({ ...f, transferable: !f.transferable })}
            style={s.check}
          />
          <Field
            label={t('pd.estOpt')}
            value={f.est}
            onChangeText={(v) => setF({ ...f, est: v })}
            placeholder="ex. 5"
            keyboardType="decimal-pad"
          />
        </>
      )}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  check: { marginBottom: 14 },
})
