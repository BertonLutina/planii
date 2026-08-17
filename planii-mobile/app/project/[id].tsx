import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  ActionMenu, Banner, Button, Confirm, Fab, Ic, Tabs,
  type ActionItem, type TabItem,
} from '@/components/ui'
import { api } from '@/lib/api'
import { canManage } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { ProjectLabel } from '@/lib/types'
import { ProjectHeader } from '@/screens/project/ProjectHeader'
import { ProjectSkeleton } from '@/screens/project/ProjectSkeleton'
import { ActivityTab } from '@/screens/project/activity/ActivityTab'
import { AppointmentsTab } from '@/screens/project/appointments/AppointmentsTab'
import { afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from '@/screens/project/lib/flow'
import { statusesOf } from '@/screens/project/lib/statuses'
import { useProjectData } from '@/screens/project/lib/useProjectData'
import { MeetingTab } from '@/screens/project/meeting/MeetingTab'
import { PollsTab } from '@/screens/project/polls/PollsTab'
import { StatusAdminSheet } from '@/screens/project/tasks/StatusAdminSheet'
import { TasksTab } from '@/screens/project/tasks/TasksTab'
import { TeamTab } from '@/screens/project/team/TeamTab'
import { DEFAULT_PROJECT_LABELS, EditProjectSheet } from '@/screens/projects'
import { useTheme } from '@/theme/ThemeProvider'

/* Détail d'un projet — portage de `ProjectDetail`
   (planii-vite/src/components/ProjectDetail.tsx, 1 300 lignes).

   Écran de pile : retour natif et geste iOS conservés, donc pas de « ‹ Retour »
   dessiné dans le corps comme sur le web.

   Trois choix de structure :

   1. Le web pose six actions de projet en ligne sous l'en-tête (meeting,
      clôturer, modifier, supprimer…). Elles passent ici dans le menu du
      bandeau : ce sont des actions rares et deux d'entre elles sont
      destructrices — elles n'ont rien à faire sur le chemin du pouce, à côté
      de la liste des tâches.

   2. Six onglets défilants au lieu des six du web plus l'écran de meeting
      séparé : « Réunion » devient un onglet (la visio Jitsi est reportée, le
      fil de discussion reste), et « Équipe » absorbe l'onglet « Membres » —
      les deux parlaient des mêmes personnes.

   3. Un projet clôturé affiche son bandeau une seule fois, sous l'en-tête :
      toutes les écritures sont déjà neutralisées par `taskPerms` et par les
      gardes de chaque onglet.

   Le bouton flottant n'existe que sur l'onglet « Tâches » : c'est le seul
   endroit où une création est l'action évidente. Écran de pile sans barre
   d'onglets, donc `tabBarHeight={0}` — le bouton se pose à
   `insets.bottom + 18`, et les listes réservent `insets.bottom + 96`. */

type Tab = 'tasks' | 'meet' | 'team' | 'appts' | 'polls' | 'activity'

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { c } = useTheme()
  const router = useRouter()
  const { me } = useSession()
  useI18n()

  const pd = useProjectData(String(id))
  const { p } = pd

  const [tab, setTab] = useState<Tab>('tasks')
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const [busy, setBusy] = useState(false)
  const [labels, setLabels] = useState<ProjectLabel[]>(DEFAULT_PROJECT_LABELS)

  /* Les libellés ne servent qu'à la feuille de réglages ; un échec retombe
     silencieusement sur les libellés par défaut. */
  useEffect(() => {
    let alive = true
    api<{ labels: ProjectLabel[] }>('GET', '/project-labels')
      .then((r) => { if (alive && r.labels.length) setLabels(r.labels) })
      .catch(() => { /* défauts */ })
    return () => { alive = false }
  }, [])

  const statuses = useMemo(() => (p ? statusesOf(p, c) : []), [p, c])

  const closed = p?.status === 'done'
  const manage = !!p && canManage(p.my_role)
  const owner = !!p && !!me && me.id === p.owner_id

  const closeProject = useCallback(async () => {
    if (!p) return
    setBusy(true)
    try {
      await api('POST', '/projects/' + p.id + '/close')
      setBusy(false)
      setCloseOpen(false)
      toastAfterSheet(t('pd.closedOk'))
      pd.reload()
    } catch (e) {
      setBusy(false)
      setCloseOpen(false)
      toastErrAfterSheet(errMsg(e))
    }
  }, [p, pd])

  const reopenProject = useCallback(async () => {
    if (!p) return
    try {
      await api('POST', '/projects/' + p.id + '/reopen')
      toastAfterSheet(t('pd.reopenOk'))
      pd.reload()
    } catch (e) { toastErrAfterSheet(errMsg(e)) }
  }, [p, pd])

  const deleteProject = useCallback(async () => {
    if (!p) return
    setBusy(true)
    try {
      const r = await api<{ notified: number }>('DELETE', '/projects/' + p.id)
      setBusy(false)
      setDelOpen(false)
      toastAfterSheet(r.notified > 0 ? t('pd.delNotif', { n: r.notified }) : t('pd.delOk'))
      router.back()
    } catch (e) {
      setBusy(false)
      setDelOpen(false)
      toastErrAfterSheet(errMsg(e))
    }
  }, [p, router])

  const menuItems: ActionItem[] = useMemo(() => {
    if (!p) return []
    const out: ActionItem[] = []
    if (owner && !closed) out.push({ label: t('action.edit'), icon: 'edit', onPress: () => afterSheet(() => setEditOpen(true)) })
    if (manage && !closed) out.push({ label: t('meet.status'), icon: 'board', onPress: () => afterSheet(() => setStatusOpen(true)) })
    out.push({ label: t('ad.refresh'), icon: 'refresh', onPress: pd.reload })
    if (manage && !closed) out.push({ label: t('pd.close'), icon: 'check', onPress: () => afterSheet(() => setCloseOpen(true)) })
    if (owner && closed && p.canReopen) out.push({ label: t('pd.reopen'), icon: 'unlock', onPress: reopenProject })
    if (owner) out.push({ label: t('action.delete'), icon: 'trash', tone: 'danger', onPress: () => afterSheet(() => setDelOpen(true)) })
    return out
  }, [p, owner, manage, closed, pd.reload, reopenProject])

  const tabs: TabItem<Tab>[] = [
    { key: 'tasks', label: t('ad.tasks'), icon: 'tasks' },
    { key: 'meet', label: t('meet.title'), icon: 'message' },
    { key: 'team', label: t('pd.tabTeam'), icon: 'users' },
    { key: 'appts', label: t('qa.appt'), icon: 'calendar' },
    { key: 'polls', label: t('pd.tabPolls'), icon: 'poll' },
    { key: 'activity', label: t('pd.tabActivity'), icon: 'activity' },
  ]

  const screenOptions = (
    <Stack.Screen
      options={{
        title: p?.name ?? t('nav.projects'),
        headerRight: () => (p
          ? (
            <Pressable
              onPress={() => setMenuOpen(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('pd.actions')}
              style={s.headBtn}
            >
              <Ic name="more-vertical" s={21} c={c.text} />
            </Pressable>
          )
          : null),
      }}
    />
  )

  /* ── États ─────────────────────────────────────────────────────────── */

  if (pd.loading && !p) {
    return (
      <View style={[s.screen, { backgroundColor: c.bg }]}>
        {screenOptions}
        <ProjectSkeleton />
      </View>
    )
  }

  if (!p || !me) {
    return (
      <View style={[s.screen, s.pad, { backgroundColor: c.bg }]}>
        {screenOptions}
        {/* Erreur bloquante, ou projet introuvable (supprimé entre-temps). */}
        <Banner tone="danger" icon="alert" text={pd.err ?? t('cmd.noResult')} />
        <Button label={t('ad.refresh')} icon="refresh" onPress={pd.reload} style={s.retry} />
      </View>
    )
  }

  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      {screenOptions}

      <ProjectHeader p={p} />

      {closed && (
        <View style={s.pad}>
          <Banner
            tone="warn"
            icon="lock"
            style={s.closedBanner}
            text={
              `${t('pd.closedT')} ${t('pd.closedX')}`
              + (owner && p.canReopen && p.reopenUntil
                ? ' ' + t('pd.reopenUntil', { d: new Date(p.reopenUntil).toLocaleDateString('fr-FR') })
                : '')
              + (owner && !p.canReopen ? ' ' + t('pd.reopenLate') : '')
            }
          />
        </View>
      )}

      <View style={s.switcher}>
        <Tabs items={tabs} value={tab} onChange={setTab} scrollable />
      </View>

      {/* Rafraîchissement en échec mais projet à l'écran : on le dit sans vider. */}
      {!!pd.err && <View style={s.pad}><Banner tone="danger" icon="alert" text={pd.err} /></View>}

      {tab === 'tasks' && (
        <TasksTab
          p={p}
          me={me}
          statuses={statuses}
          data={pd}
          newOpen={newTask}
          onCloseNew={() => setNewTask(false)}
        />
      )}
      {tab === 'meet' && <MeetingTab p={p} me={me} statuses={statuses} onChanged={pd.reload} />}
      {tab === 'team' && <TeamTab p={p} me={me} reload={pd.reload} />}
      {tab === 'appts' && <AppointmentsTab p={p} me={me} reload={pd.reload} />}
      {tab === 'polls' && <PollsTab p={p} reload={pd.reload} />}
      {tab === 'activity' && <ActivityTab projectId={p.id} />}

      {/* Dernier enfant du conteneur `flex: 1` — jamais dans une liste.
          Écran de pile : aucune barre d'onglets à franchir. */}
      {tab === 'tasks' && !closed && (
        <Fab onPress={() => setNewTask(true)} accessibilityLabel={t('qt.title')} tabBarHeight={0} />
      )}

      <ActionMenu open={menuOpen} onClose={() => setMenuOpen(false)} title={p.name} items={menuItems} />

      <EditProjectSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={p}
        labels={labels}
        onSaved={pd.reload}
      />

      <StatusAdminSheet
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        p={p}
        statuses={statuses}
        onChanged={pd.reload}
      />

      {/* Clôture — conséquence annoncée mot pour mot comme sur le web. */}
      <Confirm
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title={t('pd.closeQ')}
        message={t('pd.closeX', { n: p.name })}
        confirmLabel={t('pd.yesClose')}
        tone="accent"
        loading={busy}
        onConfirm={closeProject}
      />

      <Confirm
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title={t('pd.delQ')}
        message={
          `${t('pd.delX', { n: p.name })}`
          + `${p.members.length > 1 ? ' ' + t('pd.delMembers', { c: p.members.length - 1 }) : ''}`
          + ` ${t('pd.irrev')}`
        }
        confirmLabel={t('pd.yesDel')}
        tone="danger"
        loading={busy}
        onConfirm={deleteProject}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  pad: { paddingHorizontal: 18 },
  switcher: { paddingHorizontal: 18, paddingTop: 12 },
  closedBanner: { marginTop: 12, marginBottom: 0 },
  headBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
})
