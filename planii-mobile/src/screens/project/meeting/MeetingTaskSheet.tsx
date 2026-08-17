import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Banner, Button, Sheet } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { PRIORITIES } from '@/lib/priority'
import type { Project, TaskStatus, User } from '@/lib/types'
import { prioTone } from '@/screens/projects'
import { CheckRow } from '../controls/CheckRow'
import { ChipSelect, type ChipOption } from '../controls/ChipSelect'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'

/* Tâche née d'un message de réunion — `POST /projects/:id/meeting/tasks`.
   Même charge utile que le composeur du panneau latéral du web. */

export interface MeetingTaskSheetProps {
  open: boolean
  onClose: () => void
  p: Project
  me: User
  statuses: TaskStatus[]
  initialTitle: string
  messageId: string | null
  onCreated: () => void
}

export function MeetingTaskSheet({
  open, onClose, p, me, statuses, initialTitle, messageId, onCreated,
}: MeetingTaskSheetProps) {
  useI18n()
  const [title, setTitle] = useState(initialTitle)
  const [assigneeId, setAssigneeId] = useState('')
  const [statusKey, setStatusKey] = useState('todo')
  const [priority, setPriority] = useState(3)
  const [transferable, setTransferable] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [warn, setWarn] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(initialTitle)
    setAssigneeId('')
    setStatusKey('todo')
    setPriority(3)
    setTransferable(false)
    setErr(null)
    setWarn(null)
    setBusy(false)
  }, [open, initialTitle])

  async function create() {
    if (!title.trim()) { setErr(t('meet.titleReq')); return }
    setErr(null)
    setBusy(true)
    try {
      await api('POST', '/projects/' + p.id + '/meeting/tasks', {
        title: title.trim(),
        assigneeId: assigneeId || null,
        statusKey,
        priority,
        messageId: messageId || null,
        transferable,
      })
      onClose()
      toastAfterSheet(t('meet.taskCreated'))
      onCreated()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
    }
  }

  const memberItems: ChipOption<string>[] = [
    { key: '', label: t('meet.toTake'), tone: 'warn' },
    ...p.members.map((m) => ({ key: m.id, label: m.id === me.id ? `${m.name} ${t('vw.me')}` : m.name })),
  ]

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* création en cours */ } : onClose}
      title={t('meet.makeTask')}
      actions={
        <>
          <Button label={t('action.add')} variant="primary" loading={busy} onPress={create} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" disabled={busy} onPress={onClose} style={s.grow} />
        </>
      }
    >
      {!!warn && <Banner tone="warn" icon="info" text={warn} />}
      <MicField
        label={t('meet.titleField')}
        value={title}
        onChangeText={(v) => { setErr(null); setTitle(v) }}
        placeholder="Ex. Vérifier les photos"
        error={err}
        returnKeyType="done"
      />
      <ChipSelect label={t('td.assignee')} options={memberItems} value={assigneeId} onChange={setAssigneeId} />
      <ChipSelect
        label={t('meet.status')}
        options={statuses.map((x) => ({ key: x.key, label: trTerm(x.label) }))}
        value={statusKey}
        onChange={(v) => {
          if (v === 'transferred' && !transferable) { setWarn(t('pd.notTransferable')); return }
          setWarn(null)
          setStatusKey(v)
        }}
        scroll
      />
      <ChipSelect
        label={t('td.priority')}
        options={PRIORITIES.map((n) => ({ key: String(n), label: 'P' + n, tone: prioTone(n) }))}
        value={String(priority)}
        onChange={(v) => setPriority(Number(v))}
      />
      <CheckRow
        label={t('meet.transferable')}
        checked={transferable}
        onPress={() => {
          const next = !transferable
          setTransferable(next)
          if (!next && statusKey === 'transferred') setStatusKey('todo')
        }}
      />
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
})
