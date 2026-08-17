import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ActionMenu, Banner, Button, Fab, GroupHeader, Tabs, type TabItem } from '@/components/ui'
import { NotifBell } from '@/components/NotifBell'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { ProjectLabel } from '@/lib/types'
import { HelpButton } from '@/screens/guide'
import {
  HomeAgenda, HomeBoard, HomeList, HomeSkeleton, LevelCard, TodayBoard,
  useHome, type MyTask,
} from '@/screens/home'
import { afterSheet } from '@/screens/project/lib/flow'
import { statusOf } from '@/screens/project/lib/statuses'
import { DEFAULT_PROJECT_LABELS, NewProjectSheet } from '@/screens/projects'
import { useTheme } from '@/theme/ThemeProvider'

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
 * Le tiroir de tâche du web (`TaskDrawer`) n'a pas encore d'équivalent natif :
 * appuyer sur une tâche ouvre son projet, comme le fait déjà la vue tableau
 * du web. La dictée (`MicInput` / `VoiceTaskWizard`) est reportée. */

type HomeView = 'list' | 'board' | 'agenda'

export default function AccueilScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me } = useSession()
  useI18n()

  const [view, setView] = useState<HomeView>('list')
  const [newOpen, setNewOpen] = useState(false)
  const [labels, setLabels] = useState<ProjectLabel[]>(DEFAULT_PROJECT_LABELS)
  /** Tâche dont le menu « … » est ouvert (changement de statut). */
  const [menuFor, setMenuFor] = useState<MyTask | null>(null)

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
  const padBottom = insets.bottom + 88

  const items: TabItem<HomeView>[] = [
    { key: 'list', label: t('view.list'), icon: 'list' },
    { key: 'board', label: t('view.board'), icon: 'board' },
    { key: 'agenda', label: t('view.agenda'), icon: 'calendar-days' },
  ]

  const listHeader = (
    <View>
      <LevelCard points={home.myPoints} style={s.level} />
      <TodayBoard
        today={home.today}
        error={home.todayError}
        onOpen={openProject}
        style={s.today}
      />
      <GroupHeader title={t('home.todo')} count={home.todo.length} />
      {/* Données à l'écran mais rechargement en échec : on le dit sans vider la vue. */}
      {!!home.error && home.mine.length > 0 && (
        <Banner tone="danger" icon="alert" text={home.error} style={s.banner} />
      )}
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
        onToggle={home.toggle}
        onMenu={setMenuFor}
        contentPaddingBottom={padBottom}
      />
    )
  } else if (view === 'agenda') {
    body = <HomeAgenda onOpen={openProject} contentPaddingBottom={padBottom} />
  } else {
    body = (
      <HomeList
        groups={home.groups}
        empty={home.mine.length === 0}
        refreshing={home.refreshing}
        onRefresh={home.refresh}
        onOpen={openProject}
        onToggle={home.toggle}
        onMenu={setMenuFor}
        onCreate={() => setNewOpen(true)}
        header={listHeader}
        contentPaddingBottom={padBottom}
      />
    )
  }

  return (
    <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: c.text }]}>
          {t('nav.home')}
        </Text>
        <NotifBell />
        <HelpButton tab="accueil" />
      </View>

      <View style={s.switcher}>
        <Tabs items={items} value={view} onChange={setView} />
      </View>

      {body}

      {/* Dernier enfant du conteneur `flex: 1` — jamais dans une liste. */}
      <Fab onPress={() => setNewOpen(true)} accessibilityLabel={t('cmd.newProject')} tabBarHeight={0} />

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
  pad: { paddingHorizontal: 18 },
  level: { marginTop: 2 },
  today: { marginTop: 18 },
  banner: { marginBottom: 10 },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
})
