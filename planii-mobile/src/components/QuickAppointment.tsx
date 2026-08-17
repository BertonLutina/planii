import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Avatar, Banner, Button, EmptyState, Sheet, Skeleton, SkeletonList } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api } from '@/lib/api'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { Member, Project, ProjectSummary } from '@/lib/types'
import { ChoiceRow } from '@/screens/projects/ChoiceRow'
import { DateTimeField } from '@/screens/projects/DateTimeFields'
import { CheckRow } from '@/screens/project/controls/CheckRow'
import { toastAfterSheet, toastErrAfterSheet } from '@/screens/profile/sheetToast'
import { useTheme } from '@/theme/ThemeProvider'

/* Création rapide d'un rendez-vous — portage de
   `planii-vite/src/components/QuickAppointment.tsx`. Mêmes champs, même
   validation ; les erreurs restent en ligne tant que la feuille est ouverte.

   Deux exigences du serveur que le web omet, et qui rendaient toute création
   impossible (`createAppointment` : « Intitulé requis », « Sélectionnez au
   moins un participant ») : l'intitulé est obligatoire, et il faut au moins
   un participant. On charge donc les membres du projet choisi, avec
   l'utilisateur pré-coché — comme la feuille complète du projet. */

export interface QuickAppointmentProps {
  open: boolean
  onClose: () => void
  /** Appelé après une création réussie (la feuille est déjà fermée). */
  onCreated: () => void
}

interface Errs { project?: string; title?: string; date?: string; start?: string; end?: string; parts?: string }

export function QuickAppointment({ open, onClose, onCreated }: QuickAppointmentProps) {
  useI18n()
  const { c } = useTheme()
  const { me } = useSession()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [f, setF] = useState({ projectId: '', title: '', date: '', timeStart: '', timeEnd: '', participants: [] as string[] })
  const [err, setErr] = useState<Errs | null>(null)
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

  /* Les résumés ne portent pas les membres : il faut le projet complet. */
  useEffect(() => {
    if (!open || !f.projectId) { setMembers(null); return }
    let alive = true
    setMembers(null)
    api<Project>('GET', '/projects/' + f.projectId)
      .then((p) => {
        if (!alive) return
        setMembers(p.members)
        const mine = me && p.members.some((m) => m.id === me.id) ? [me.id] : []
        setF((v) => ({ ...v, participants: mine }))
      })
      .catch(() => { if (alive) setMembers([]) })
    return () => { alive = false }
  }, [open, f.projectId, me])

  useEffect(() => {
    if (open) return
    setF({ projectId: '', title: '', date: '', timeStart: '', timeEnd: '', participants: [] })
    setMembers(null)
    setErr(null)
    setBusy(false)
  }, [open])

  const toggle = (id: string) => setF((v) => ({
    ...v,
    participants: v.participants.includes(id) ? v.participants.filter((x) => x !== id) : [...v.participants, id],
  }))

  async function create() {
    const e: Errs = {}
    if (!f.projectId) e.project = t('qt.pickProject')
    if (!f.title.trim()) e.title = t('pd.titleReq')
    if (!f.date) e.date = t('pd.dateReq')
    if (!f.timeStart) e.start = t('pd.slotReq')
    if (!f.timeEnd) e.end = t('pd.slotReq')
    if (f.timeStart && f.timeEnd && f.timeEnd <= f.timeStart) e.end = t('pd.endAfter')
    if (!f.participants.length) e.parts = t('pd.needPart')
    if (Object.keys(e).length) { setErr(e); return }

    setErr(null)
    setBusy(true)
    try {
      await api('POST', '/projects/' + f.projectId + '/appointments', {
        title: f.title.trim(),
        date: f.date,
        timeStart: f.timeStart,
        timeEnd: f.timeEnd,
        participantIds: f.participants,
      })
      onClose()
      toastAfterSheet(t('qa.created'))
      onCreated()
    } catch (ex) {
      setBusy(false)
      onClose()
      toastErrAfterSheet((ex as Error).message)
    }
  }

  const empty = projects != null && projects.length === 0 && !loadErr

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('qa.title')}
      actions={empty || loadErr ? undefined : (
        <>
          <Button label={t('action.create')} variant="primary" loading={busy} onPress={create} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />
        </>
      )}
    >
      {loadErr && <Banner tone="danger" icon="alert" text={loadErr} style={s.gap} />}

      {projects == null && !loadErr && <SkeletonList count={3} itemHeight={56} />}

      {empty && <EmptyState icon="calendar" title={t('qa.needProject')} />}

      {projects != null && projects.length > 0 && (
        <View>
          <MicField
            label={t('qt.label')}
            value={f.title}
            onChangeText={(v) => setF({ ...f, title: v })}
            placeholder="Ex. Point d’avancement"
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
          <DateTimeField
            label={t('qa.date')}
            value={f.date}
            onChange={(v) => setF({ ...f, date: v })}
            error={err?.date}
          />
          <View style={s.times}>
            <DateTimeField
              label={t('qa.start')}
              mode="time"
              value={f.timeStart}
              onChange={(v) => setF({ ...f, timeStart: v })}
              error={err?.start}
              style={s.half}
            />
            <DateTimeField
              label={t('qa.end')}
              mode="time"
              value={f.timeEnd}
              onChange={(v) => setF({ ...f, timeEnd: v })}
              error={err?.end}
              style={s.half}
            />
          </View>

          <Text style={[s.label, { color: c.muted }]}>{t('pd.parts')}</Text>
          {members == null && <Skeleton height={50} style={s.gap} />}
          {members != null && members.map((m) => (
            <CheckRow
              key={m.id}
              label={m.name}
              sub={m.job}
              left={<Avatar name={m.name} size={30} />}
              checked={f.participants.includes(m.id)}
              onPress={() => toggle(m.id)}
            />
          ))}
          {!!err?.parts && <Text style={[s.err, { color: c.dangerOn }]}>{err.parts}</Text>}
        </View>
      )}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  gap: { marginBottom: 12 },
  times: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  err: { fontSize: 12.5, marginTop: 6 },
})

export default QuickAppointment
