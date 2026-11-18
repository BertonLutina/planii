import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ActionMenu, Banner, Button, Fab, Ic, NATIVE_TAB_BAR } from '@/components/ui'
import { NotifBell } from '@/components/NotifBell'
import { QuickAppointment } from '@/components/QuickAppointment'
import { QuickTask } from '@/components/QuickTask'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { ProjectLabel } from '@/lib/types'
import { HelpButton } from '@/screens/guide'
import {
  HomeAgenda, HomeBoard, HomeFocus, HomeSkeleton,
  useHome, type MyTask,
} from '@/screens/home'
import { afterSheet } from '@/screens/project/lib/flow'
import { statusOf } from '@/screens/project/lib/statuses'
import { TaskSheet } from '@/screens/project/tasks/TaskSheet'
import { DEFAULT_PROJECT_LABELS, NewProjectSheet } from '@/screens/projects'
import { PvThemeScope, usePv, useTheme } from '@/theme/ThemeProvider'

/* Accueil — portage de `Home` (planii-vite/src/components/Home.tsx).
 *
 * Le web pose le sélecteur de vue (Liste · Tableau · Agenda) dans la barre
 * d'application ; ici il devient un contrôle segmenté épinglé sous le titre :
 * il ne défile pas, donc changer de vue reste à un pouce de distance quelle
 * que soit la position dans la liste.
 *
 * La carte de score et le tableau du jour appartiennent à la vue « liste » —
 * c'est son contexte. Les deux autres vues ont besoin de toute la hauteur :
 * un kanban coincé sous 400 pt de tableau de bord ne se lit pas, et l'agenda
 * non plus. Les trois vues restent à un appui l'une de l'autre.
 *
 * Appuyer sur une tâche ouvre sa feuille (`TaskSheet`), comme le tiroir du
 * web. Le « + » propose une tâche, un rendez-vous ou un projet : sur un
 * téléphone, créer une tâche est le geste le plus fréquent, et il ne doit
 * pas obliger à entrer dans un projet d'abord. */

type HomeView = 'list' | 'board' | 'agenda'

/** L'accueil vit dans la palette du prototype (clair et sombre), comme la page projet. */
export default function AccueilScreen() {
  return <PvThemeScope><Accueil /></PvThemeScope>
}

function Accueil() {
  const { c } = useTheme()
  const pv = usePv()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me } = useSession()
  useI18n()

  const [view, setView] = useState<HomeView>('list')
  const [newOpen, setNewOpen] = useState(false)
  const [pick, setPick] = useState(false)
  const [quick, setQuick] = useState<'task' | 'appt' | null>(null)
  const [labels, setLabels] = useState<ProjectLabel[]>(DEFAULT_PROJECT_LABELS)
  /** Tâche dont le menu « … » est ouvert (changement de statut). */
  const [menuFor, setMenuFor] = useState<MyTask | null>(null)
  /** Tâche ouverte dans la feuille de détail. */
  const [detail, setDetail] = useState<MyTask | null>(null)
  /* Gardée après la fermeture : la modale doit rester montée pour s'animer. */
  const heldDetail = useRef<MyTask | null>(null)
  if (detail) heldDetail.current = detail
  const shownDetail = detail ?? heldDetail.current

  const home = useHome(me?.id)

  /* Les libellés ne servent qu'à la feuille de création ; un échec retombe
     silencieusement sur les deux libellés par défaut. */
  useEffect(() => {
    let alive = true
    api<{ labels: ProjectLabel[] }>('GET', '/project-labels')
      .then((r) => { if (alive && r.labels.length) setLabels(r.labels) })
      .catch(() => { /* défauts */ })
    return () => { alive = false }
  }, [])

  const openProject = useCallback((id: string) => {
    router.push({ pathname: '/project/[id]', params: { id } })
  }, [router])

  const openKnownTask = useCallback((item: MyTask) => setDetail(item), [])

  /* Le tableau du jour ne porte qu'un résumé. Si la tâche est déjà dans les
     projets chargés, on ouvre sa feuille ; sinon on entre dans le projet. */
  const openTodayTask = useCallback((task: { id: string; projectId: string }) => {
    for (const p of home.projects || []) {
      const t = p.tasks.find((x) => x.id === task.id)
      if (t) { setDetail({ t, p }); return }
    }
    openProject(task.projectId)
  }, [home.projects, openProject])

  const openQuick = useCallback((k: 'task' | 'appt') => {
    setTimeout(() => setQuick(k), 340)
  }, [])

  const statusItems = useMemo(() => {
    if (!menuFor) return []
    const current = statusOf(menuFor.t)
    return home.statuses
      .filter((st) => st.key !== current)
      .map((st) => ({
        label: trTerm(st.label),
        icon: st.key === 'done' ? 'check' : st.key === 'transferred' ? 'transfer' : 'circle',
        /* On laisse la feuille finir sa sortie avant de lancer la requête :
           le toast de confirmation ne doit jamais s'afficher sous une modale. */
        onPress: () => afterSheet(() => home.moveTask(menuFor.t, menuFor.p, st.key)),
      }))
  }, [menuFor, home])

  /* Le bas des listes doit dégager le bouton flottant (56 pt + sa marge). */
  const padBottom = insets.bottom + NATIVE_TAB_BAR + 88

  const switcher = (
    <View style={s.switcher}>
      <View style={[s.seg, { backgroundColor: pv.raised, borderColor: pv.line2 }]} accessibilityRole="tablist">
        {([['list', t('view.list'), 'list'], ['board', t('view.board'), 'board'], ['agenda', t('view.agenda'), 'calendar-days']] as const).map(([k, label, icon]) => {
          const on = view === k
          return (
            <Pressable
              key={k}
              onPress={() => setView(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[s.segBtn, on && { backgroundColor: pv.col2 }]}
            >
              <Ic name={icon} s={15} c={on ? pv.text : pv.muted} />
              <Text style={[s.segTxt, { color: on ? pv.text : pv.muted }]}>{label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )

  let body: React.ReactNode
  if (!home.projects) {
    body = <HomeSkeleton />
  } else if (home.error && home.mine.length === 0) {
    body = (
      <View style={s.pad}>
        <Banner tone="danger" icon="alert" text={home.error} />
        <Button label={t('ad.refresh')} icon="refresh" onPress={home.reload} style={s.retry} />
      </View>
    )
  } else if (view === 'board') {
    body = (
      <HomeBoard
        cols={home.boardCols}
        refreshing={home.refreshing}
        onRefresh={home.refresh}
        onOpen={openProject}
        onOpenTask={openKnownTask}
        onToggle={home.toggle}
        onMenu={setMenuFor}
        contentPaddingBottom={padBottom}
      />
    )
  } else if (view === 'agenda') {
    body = <HomeAgenda onOpen={openProject} contentPaddingBottom={padBottom} />
  } else {
    body = (
      <HomeFocus
        me={me}
        home={home}
        onOpen={openProject}
        onOpenTask={openKnownTask}
        onMenu={setMenuFor}
        onCreate={() => setNewOpen(true)}
        contentPaddingBottom={padBottom}
      />
    )
  }

  return (
    <View style={[s.screen, { backgroundColor: pv.bg, paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: c.text }]}>
          {t('nav.home')}
        </Text>
        <NotifBell />
        <HelpButton tab="accueil" />
      </View>

      {switcher}

      {body}

      {/* Dernier enfant du conteneur `flex: 1` — jamais dans une liste. */}
      <Fab onPress={() => setPick(true)} accessibilityLabel={t('action.new')} />

      <ActionMenu
        open={pick}
        onClose={() => setPick(false)}
        title={t('action.new')}
        items={[
          { label: t('qa.task'), icon: 'tasks', onPress: () => openQuick('task') },
          { label: t('qa.appt'), icon: 'calendar', onPress: () => openQuick('appt') },
          { label: t('cmd.newProject'), icon: 'folder', onPress: () => setTimeout(() => setNewOpen(true), 340) },
        ]}
      />

      <QuickTask
        open={quick === 'task'}
        onClose={() => setQuick(null)}
        onCreated={() => { setQuick(null); home.reload() }}
        me={me}
      />
      <QuickAppointment
        open={quick === 'appt'}
        onClose={() => setQuick(null)}
        onCreated={() => { setQuick(null); home.reload() }}
      />

      {!!shownDetail && !!me && (
        <TaskSheet
          open={!!detail}
          onClose={() => setDetail(null)}
          task={shownDetail.t}
          p={shownDetail.p}
          me={me}
          statuses={shownDetail.p.statuses?.length ? shownDetail.p.statuses : home.statuses}
          onSaved={home.reload}
          onOpenProject={() => {
            const id = shownDetail.p.id
            setDetail(null)
            setTimeout(() => openProject(id), 340)
          }}
        />
      )}

      <ActionMenu
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={t('meet.status')}
        items={statusItems}
      />

      <NewProjectSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        labels={labels}
        onCreated={(id) => { setNewOpen(false); openProject(id) }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { flex: 1, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  switcher: { paddingHorizontal: 18, paddingBottom: 14 },
  seg: { flexDirection: 'row', padding: 4, gap: 2, borderWidth: 1, borderRadius: 14, alignSelf: 'flex-start' },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 10 },
  segTxt: { fontSize: 14, fontWeight: '700' },
  pad: { paddingHorizontal: 18 },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
})
