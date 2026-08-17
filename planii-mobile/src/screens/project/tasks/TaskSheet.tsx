import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  Banner, Button, Field, PriorityFlag, Sheet, Tabs, type TabItem,
} from '@/components/ui'
import { MicField, MicTextArea } from '@/components/Mic'
import { api } from '@/lib/api'
import { formatDue } from '@/lib/dates'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { PRIORITIES, prio } from '@/lib/priority'
import { taskTypesOf, typeTone } from '@/lib/tasktype'
import type { Project, Task, TaskStatus, User } from '@/lib/types'
import { prioTone } from '@/screens/projects'
import { useTheme } from '@/theme/ThemeProvider'
import { CheckRow } from '../controls/CheckRow'
import { ChipSelect, type ChipOption } from '../controls/ChipSelect'
import { DateField } from '../controls/DateField'
import { useSheetBody } from '../controls/useSheetBody'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'
import { taskPerms } from '../lib/perms'
import { findStatus, statusOf } from '../lib/statuses'
import { Tag } from './Tag'
import { TaskComments } from './TaskComments'
import { TaskHistory } from './TaskHistory'

/* Détail d'une tâche — portage de `TaskDrawer` + `EditTask`
   (planii-vite/src/components/TaskDrawer.tsx / ProjectDetail.tsx).

   Le web empile le formulaire, les commentaires et l'historique dans une seule
   colonne de modale : sur téléphone ça ferait 2 500 pt de défilement avant
   d'atteindre le champ de commentaire. Trois onglets internes à la place —
   la feuille garde une hauteur ferme, chaque onglet gère son propre défilement,
   et le fil de commentaires reste une liste virtualisée avec son composeur
   collé au clavier.

   La dictée (`MicInput`) est reportée : champs simples. */

type Pane = 'task' | 'comments' | 'history'

export interface TaskSheetProps {
  open: boolean
  onClose: () => void
  task: Task | null
  p: Project
  me: User
  statuses: TaskStatus[]
  /** Rechargement du projet après enregistrement. */
  onSaved: () => void
}

interface Draft {
  title: string
  desc: string
  type: string
  assigneeId: string
  due: string
  est: string
  spent: string
  priority: number
  statusKey: string
  transferredTo: string
  transferable: boolean
}

const draftOf = (x: Task): Draft => ({
  title: x.title,
  desc: x.description ?? '',
  type: x.type ?? '',
  assigneeId: x.assigneeId ?? '',
  due: x.due ? String(x.due).slice(0, 10) : '',
  est: x.estHours != null ? String(x.estHours) : '',
  spent: x.spentHours != null ? String(x.spentHours) : '',
  priority: prio(x.priority),
  statusKey: statusOf(x),
  transferredTo: x.transferredTo ?? '',
  transferable: x.transferable === true,
})

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(',', '.')))

export function TaskSheet({ open, onClose, task, p, me, statuses, onSaved }: TaskSheetProps) {
  const { c } = useTheme()
  useI18n()
  /* Hauteur ferme : `Sheet` plafonne à 90 % de l'écran, en-tête et pied
     compris — au-delà de ~0,6 le formulaire serait rogné sur un petit écran. */
  const body = useSheetBody(0.6, 340, 560)
  const [pane, setPane] = useState<Pane>('task')
  const [f, setF] = useState<Draft | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const perms = task ? taskPerms(task, p, me, !!task.parentId) : null
  const myTypes = taskTypesOf(me)

  useEffect(() => {
    if (!open || !task) return
    setF(draftOf(task))
    setPane('task')
    setErr(null)
    setFormErr(null)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id])

  const canEdit = !!perms && (perms.canEditMeta || perms.canLogHours || perms.canPrio || perms.canMove)

  const typeItems: ChipOption<string>[] = useMemo(() => {
    const all = [...new Set([...myTypes, ...(task?.type ? [task.type] : [])])]
    return [{ key: '', label: t('vw.none') }, ...all.map((x) => ({ key: x, label: trTerm(x), tone: typeTone(x) }))]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.type, myTypes.join('|')])

  const memberItems: ChipOption<string>[] = [
    { key: '', label: t('vw.toTakeOpt'), tone: 'warn' },
    ...p.members.map((m) => ({ key: m.id, label: m.id === me.id ? `${m.name} ${t('vw.me')}` : m.name })),
  ]

  async function save() {
    if (!task || !f) return
    const payload: Record<string, unknown> = { priority: f.priority }
    if (perms?.canEditMeta) {
      if (!f.title.trim()) { setErr(t('pd.titleEmpty')); setPane('task'); return }
      payload.title = f.title.trim()
      payload.description = f.desc.trim() || null
      payload.type = f.type || null
      payload.due = f.due || null
      payload.assigneeId = f.assigneeId || null
      payload.transferable = f.transferable
    }
    if (perms?.canLogHours) {
      payload.estHours = num(f.est)
      payload.spentHours = num(f.spent)
    }
    /* N'envoyer le statut que s'il a bougé. Sur une tâche déjà « transférée »,
       le renvoyer relance la branche transfert du serveur, qui compare la
       cible à `assignee_id` — or le premier transfert les a rendus égaux :
       toute sauvegarde échouait donc en « Choisissez une autre personne »,
       et une sauvegarde qui passait rejouait les e-mails de transfert. */
    if (f.statusKey !== statusOf(task)) {
      payload.statusKey = f.statusKey
      payload.transferredTo = f.statusKey === 'transferred' ? (f.transferredTo || null) : null
    }
    setErr(null)
    setFormErr(null)
    setBusy(true)
    try {
      await api('PATCH', '/tasks/' + task.id, payload)
      onClose()
      toastAfterSheet(t('pd.taskUpd'))
      onSaved()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
    }
  }

  const panes: TabItem<Pane>[] = [
    { key: 'task', label: t('qa.task'), icon: 'tasks' },
    { key: 'comments', label: t('pd.commentBtn'), icon: 'message' },
    { key: 'history', label: t('pd.history'), icon: 'activity' },
  ]

  const st = task ? findStatus(statuses, statusOf(task)) : undefined
  const statusItems: ChipOption<string>[] = statuses.map((x) => ({ key: x.key, label: trTerm(x.label) }))

  /* Le pied d'actions ne porte « Enregistrer » que sur l'onglet du formulaire :
     un bouton principal par vue. */
  const actions = pane === 'task' && canEdit
    ? (
      <>
        <Button label={t('action.save')} variant="primary" loading={busy} onPress={save} style={s.grow} />
        <Button label={t('action.cancel')} variant="ghost" disabled={busy} onPress={onClose} style={s.grow} />
      </>
    )
    : <Button label={t('action.close')} variant="ghost" onPress={onClose} style={s.grow} />

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* enregistrement en cours */ } : onClose}
      title={task?.title ?? t('qa.task')}
      scrollable={false}
      contentStyle={body}
      actions={actions}
    >
      {/* Enveloppe obligatoire : `Tabs scrollable` est un ScrollView, donc
          `flexGrow: 1` par défaut — posé nu dans une feuille de hauteur ferme
          il mangerait la place du corps. Le conteneur à hauteur automatique le
          ramène à la taille de son contenu. */}
      <View style={s.tabs}><Tabs items={panes} value={pane} onChange={setPane} scrollable /></View>

      {!task || !f
        ? null
        : pane === 'comments'
          ? <TaskComments taskId={task.id} closed={p.status === 'done'} />
          : pane === 'history'
            ? <View style={s.fill}><TaskHistory taskId={task.id} /></View>
            : (
              <ScrollView
                style={s.fill}
                contentContainerStyle={s.form}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {!!formErr && <Banner tone="warn" icon="info" text={formErr} />}
                {perms?.closed && <Banner tone="warn" icon="lock" text={t('pd.closedRO')} />}

                {/* Résumé — toujours visible, y compris en lecture seule. */}
                <View style={s.head}>
                  <View style={s.headLine}>
                    <PriorityFlag priority={task.priority} />
                    {!!task.type && <Tag label={trTerm(task.type)} tone={typeTone(task.type)} />}
                    {!!st && <Tag label={trTerm(st.label)} dot={st.color} tone="neutral" />}
                  </View>
                  <Text style={[s.title, { color: c.text }]}>{task.title}</Text>
                  {!!task.description && (
                    <Text style={[s.desc, { color: c.muted }]}>{task.description}</Text>
                  )}
                  <View style={s.headLine}>
                    <Tag
                      label={perms?.unassigned ? t('vw.toTake') : (perms?.assignee?.name ?? '—')}
                      icon={perms?.unassigned ? 'hand' : 'user'}
                      tone={perms?.unassigned ? 'warn' : 'neutral'}
                    />
                    {!!task.due && (
                      <Tag label={formatDue(task.due)} icon="calendar" tone={perms?.over ? 'danger' : 'neutral'} />
                    )}
                    {(task.spentHours != null || task.estHours != null) && (
                      <Tag
                        icon="clock"
                        tone="neutral"
                        label={`${task.spentHours ?? 0}h${task.estHours != null ? ` / ~${task.estHours}h` : ''}`}
                      />
                    )}
                    {task.transferable && <Tag label={t('pd.transferableTag')} icon="transfer" tone="accent" />}
                  </View>
                  {!!task.transferHistory?.length && (
                    <View style={s.path}>
                      {task.transferHistory.map((h) => (
                        <Text key={h.id} numberOfLines={1} style={[s.pathTxt, { color: c.muted }]}>
                          {h.fromName || t('pd.depart')} → {h.toName}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                {canEdit && <View style={[s.sep, { backgroundColor: c.line }]} />}

                {perms?.canEditMeta && (
                  <>
                    <MicField
                      label={t('qt.label')}
                      value={f.title}
                      onChangeText={(v) => { setErr(null); setF({ ...f, title: v }) }}
                      error={err}
                      returnKeyType="done"
                    />
                    <MicTextArea
                      label={t('pd.desc')}
                      value={f.desc}
                      onChangeText={(v) => setF({ ...f, desc: v })}
                      placeholder="Détails, contexte…"
                    />
                    <ChipSelect
                      label={t('qt.type')}
                      options={typeItems}
                      value={f.type}
                      onChange={(v) => setF({ ...f, type: v })}
                    />
                    <ChipSelect
                      label={t('td.assignee')}
                      options={memberItems}
                      value={f.assigneeId}
                      onChange={(v) => setF({ ...f, assigneeId: v })}
                    />
                    <DateField
                      label={t('td.due')}
                      value={f.due}
                      onChange={(v) => setF({ ...f, due: v })}
                      placeholder={t('vw.noneF')}
                    />
                    <CheckRow
                      label={t('meet.transferable')}
                      checked={f.transferable}
                      onPress={() => setF({
                        ...f,
                        transferable: !f.transferable,
                        statusKey: !f.transferable
                          ? f.statusKey
                          : (f.statusKey === 'transferred' ? 'todo' : f.statusKey),
                      })}
                      style={s.check}
                    />
                  </>
                )}

                {perms?.canLogHours && (
                  <>
                    <Field
                      label={t('pd.estH')}
                      value={f.est}
                      onChangeText={(v) => setF({ ...f, est: v })}
                      placeholder="ex. 5"
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label={t('pd.spentH')}
                      value={f.spent}
                      onChangeText={(v) => setF({ ...f, spent: v })}
                      placeholder="ex. 3"
                      keyboardType="decimal-pad"
                    />
                    <Button
                      label={t('pd.day8')}
                      size="sm"
                      accessibilityLabel={t('pd.fullDay')}
                      onPress={() => setF({ ...f, spent: '8' })}
                      style={s.day}
                    />
                  </>
                )}

                {perms?.canPrio && (
                  <ChipSelect
                    label={t('td.priority')}
                    options={PRIORITIES.map((n) => ({ key: String(n), label: 'P' + n, tone: prioTone(n) }))}
                    value={String(f.priority)}
                    onChange={(v) => setF({ ...f, priority: Number(v) })}
                  />
                )}

                {perms?.canMove && (
                  <ChipSelect
                    label={t('meet.status')}
                    options={statusItems}
                    value={f.statusKey}
                    onChange={(v) => {
                      /* Même garde que le web : pas de « transféré » sur une
                         tâche non transférable. */
                      if (v === 'transferred' && !f.transferable) { setFormErr(t('pd.notTransferable')); return }
                      setFormErr(null)
                      setF({ ...f, statusKey: v })
                    }}
                    scroll
                  />
                )}

                {perms?.canMove && f.statusKey === 'transferred' && (
                  <ChipSelect
                    label={t('pd.transferTo')}
                    options={p.members.map((m) => ({ key: m.id, label: m.name }))}
                    value={f.transferredTo}
                    onChange={(v) => setF({ ...f, transferredTo: v })}
                  />
                )}
              </ScrollView>
            )}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  fill: { flex: 1 },
  tabs: { marginBottom: 12 },
  form: { paddingBottom: 12 },
  head: { gap: 7 },
  headLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 23, letterSpacing: -0.2 },
  desc: { fontSize: 14, lineHeight: 20 },
  path: { gap: 3, marginTop: 2 },
  pathTxt: { fontSize: 12.5 },
  sep: { height: 1, marginVertical: 16 },
  check: { marginBottom: 14 },
  day: { marginBottom: 14, alignSelf: 'flex-start' },
})
