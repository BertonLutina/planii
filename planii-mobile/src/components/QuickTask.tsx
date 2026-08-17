import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Banner, Button, EmptyState, Sheet, SkeletonList } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { PRIORITIES } from '@/lib/priority'
import { useSession } from '@/lib/session'
import { taskTypesOf, typeTone } from '@/lib/tasktype'
import type { ProjectSummary, User } from '@/lib/types'
import { ChoiceRow, prioTone, type Choice } from '@/screens/projects/ChoiceRow'
import { DateTimeField } from '@/screens/projects/DateTimeFields'
import { toastAfterSheet, toastErrAfterSheet } from '@/screens/profile/sheetToast'

/* Ajout rapide d'une tâche — portage de `planii-vite/src/components/QuickTask.tsx`.
   La modale du web devient une feuille ; l'intitulé porte le micro, comme le
   `MicInput` du web. */

export interface QuickTaskProps {
  open: boolean
  onClose: () => void
  /** Appelé après une création réussie (la feuille est déjà fermée). */
  onCreated: () => void
  /** Facultatif : par défaut l'utilisateur de la session. */
  me?: User | null
}

export function QuickTask({ open, onClose, onCreated, me: meProp }: QuickTaskProps) {
  const { me: meSession } = useSession()
  const me = meProp ?? meSession
  useI18n()
  const myTypes = taskTypesOf(me)

  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [f, setF] = useState({ projectId: '', title: '', type: myTypes[0] || '', priority: 6, due: '' })
  const [err, setErr] = useState<{ title?: string; project?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoadErr(null)
    api<{ projects: ProjectSummary[] }>('GET', '/projects')
      .then((r) => {
        if (!alive) return
        const active = r.projects.filter((p) => p.status !== 'done')
        setProjects(active)
        if (active[0]) setF((v) => ({ ...v, projectId: v.projectId || active[0].id }))
      })
      .catch((e: Error) => { if (alive) { setLoadErr(e.message); setProjects([]) } })
    return () => { alive = false }
  }, [open])

  /* Remise à zéro à chaque ouverture — une feuille rouverte repart propre. */
  useEffect(() => {
    if (open) return
    setF({ projectId: '', title: '', type: myTypes[0] || '', priority: 6, due: '' })
    setErr(null)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function create() {
    if (!f.title.trim()) { setErr({ title: t('pd.titleReq') }); return }
    if (!f.projectId) { setErr({ project: t('qt.pickProject') }); return }
    setErr(null)
    setBusy(true)
    try {
      await api('POST', '/projects/' + f.projectId + '/tasks', {
        title: f.title.trim(),
        type: f.type || null,
        priority: f.priority,
        due: f.due || null,
        assigneeId: me?.id ?? null,
      })
      onClose()
      toastAfterSheet(t('qt.created'))
      onCreated()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet((e as Error).message)
    }
  }

  const empty = projects != null && projects.length === 0 && !loadErr
  const typeItems: Choice<string>[] = [
    { key: '', label: '—' },
    ...myTypes.map((x) => ({ key: x, label: trTerm(x), tone: typeTone(x) })),
  ]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('qt.title')}
      actions={empty || loadErr ? undefined : (
        <>
          <Button label={t('action.create')} variant="primary" loading={busy} onPress={create} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />
        </>
      )}
    >
      {loadErr && <Banner tone="danger" icon="alert" text={loadErr} style={s.gap} />}

      {projects == null && !loadErr && <SkeletonList count={3} itemHeight={56} />}

      {empty && <EmptyState icon="folder" title={t('qt.needProject')} />}

      {projects != null && projects.length > 0 && (
        <View>
          <MicField
            label={t('qt.label')}
            value={f.title}
            onChangeText={(v) => setF({ ...f, title: v })}
            placeholder="Ex. Relire le chapitre 4"
            error={err?.title}
            returnKeyType="done"
          />
          <ChoiceRow
            label={t('qt.project')}
            items={projects.map((p) => ({ key: p.id, label: p.name }))}
            value={f.projectId}
            onChange={(v) => setF({ ...f, projectId: v })}
            error={err?.project}
          />
          <ChoiceRow
            label={t('qt.type')}
            items={typeItems}
            value={f.type}
            onChange={(v) => setF({ ...f, type: v })}
          />
          <ChoiceRow
            label={t('qt.priority')}
            items={PRIORITIES.map((n) => ({ key: String(n), label: 'P' + n, tone: prioTone(n) }))}
            value={String(f.priority)}
            onChange={(v) => setF({ ...f, priority: Number(v) })}
          />
          <DateTimeField
            label={t('qt.due')}
            value={f.due}
            onChange={(v) => setF({ ...f, due: v })}
            clearable
            placeholder={t('vw.none')}
          />
        </View>
      )}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  gap: { marginBottom: 12 },
})

export default QuickTask
