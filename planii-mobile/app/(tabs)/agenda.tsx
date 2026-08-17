import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ActionMenu, Banner, Button, Fab, Tabs, type TabItem } from '@/components/ui'
import { NotifBell } from '@/components/NotifBell'
import { QuickAppointment } from '@/components/QuickAppointment'
import { QuickTask } from '@/components/QuickTask'
import { isSameMonth, todayMid } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import { useRealtime } from '@/lib/realtime'
import { AgendaList } from '@/screens/agenda/AgendaList'
import { CalendarSkeleton } from '@/screens/agenda/CalendarSkeleton'
import { MonthView } from '@/screens/agenda/MonthView'
import { useCalendar } from '@/screens/agenda/useCalendar'
import { HelpButton } from '@/screens/guide'
import { useTheme } from '@/theme/ThemeProvider'

/* Agenda — portage de `CalendarView` (planii-vite/src/components/Calendar.tsx).
 *
 * Le web propose cinq vues (mois · semaine · jour · agenda · heatmap annuelle).
 * Sur un téléphone il n'en reste que deux qui tiennent honnêtement dans une
 * colonne de 320 px :
 *   — « Agenda » (par défaut ici, alors que le web ouvre sur « mois ») : la
 *     liste de ce qui arrive, groupée par jour, lisible et tactile ;
 *   — « Mois » : la grille en carte de densité, le détail du jour choisi
 *     juste en dessous — ce qui absorbe la vue « jour » du web.
 * « Semaine » n'ajoute rien à la liste agenda, et la heatmap annuelle
 * demanderait 53 colonnes : 6 px par case à 320 px, illisible et intouchable.
 *
 * Le + n'ouvre pas un formulaire mais un choix — rendez-vous ou tâche —
 * comme `agendaPick` du web. */

type CalView = 'agenda' | 'mois'
type Quick = 'appt' | 'task' | null

/** Laisse la feuille de choix finir sa sortie avant d'en ouvrir une autre :
 *  jamais deux fenêtres modales empilées. */
const SHEET_GAP = 340

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

export default function AgendaScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  useI18n()

  const [view, setView] = useState<CalView>('agenda')
  const [cur, setCur] = useState(() => firstOfMonth(todayMid()))
  const [selected, setSelected] = useState(() => todayMid())
  const [pick, setPick] = useState(false)
  const [quick, setQuick] = useState<Quick>(null)

  const { events, error, refreshing, reload, refresh } = useCalendar(cur.getFullYear())
  useRealtime((m) => { if (m.type === 'project' || m.type === 'notif') reload() })

  /* Le mois affiché est toujours ramené au 1er : `addMonths` décale sinon les
     fins de mois (31 janvier + 1 mois = 3 mars). La sélection suit le mois pour
     que le détail du bas parle bien de la grille du haut. */
  const changeMonth = useCallback((d: Date) => {
    const first = firstOfMonth(d)
    setCur(first)
    const today = todayMid()
    setSelected(isSameMonth(first, today) ? today : first)
  }, [])

  const openProject = useCallback((id: string) => {
    router.push({ pathname: '/project/[id]', params: { id } })
  }, [router])

  const openQuick = useCallback((k: Exclude<Quick, null>) => {
    setTimeout(() => setQuick(k), SHEET_GAP)
  }, [])

  const items: TabItem<CalView>[] = [
    { key: 'agenda', label: t('cal.agendaView'), icon: 'list' },
    { key: 'mois', label: t('cal.month'), icon: 'calendar-days' },
  ]

  const switcher = (
    <View style={s.switcher}>
      <Tabs items={items} value={view} onChange={setView} />
      {/* Données à l'écran mais rafraîchissement en échec : on le dit sans
          vider la vue. */}
      {!!error && !!events?.length && <Banner tone="danger" icon="alert" text={error} style={s.banner} />}
    </View>
  )

  /* Le bas de la liste doit dégager le bouton flottant (56 pt + sa marge). */
  const padBottom = insets.bottom + 88

  let body: React.ReactNode
  if (!events) {
    body = (
      <View style={s.pad}>
        {switcher}
        <CalendarSkeleton view={view} />
      </View>
    )
  } else if (error && events.length === 0) {
    body = (
      <View style={s.pad}>
        {switcher}
        <Banner tone="danger" icon="alert" text={error} style={s.banner} />
        <Button label={t('ad.refresh')} icon="refresh" onPress={reload} style={s.retry} />
      </View>
    )
  } else if (view === 'agenda') {
    body = (
      <AgendaList
        events={events}
        refreshing={refreshing}
        onRefresh={refresh}
        onOpen={openProject}
        header={switcher}
        contentPaddingBottom={padBottom}
      />
    )
  } else {
    body = (
      <MonthView
        events={events}
        cur={cur}
        onChangeMonth={changeMonth}
        selected={selected}
        onSelect={setSelected}
        refreshing={refreshing}
        onRefresh={refresh}
        onOpen={openProject}
        header={switcher}
        contentPaddingBottom={padBottom}
      />
    )
  }

  return (
    <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: c.text }]}>
          {t('nav.agenda')}
        </Text>
        <NotifBell />
        <HelpButton tab="calendrier" />
      </View>

      {body}

      {/* Dernier enfant du conteneur `flex: 1` — jamais dans une liste. */}
      <Fab onPress={() => setPick(true)} accessibilityLabel={t('qa.pick')} tabBarHeight={0} />

      <ActionMenu
        open={pick}
        onClose={() => setPick(false)}
        title={t('qa.pick')}
        items={[
          { label: t('qa.appt'), icon: 'calendar', onPress: () => openQuick('appt') },
          { label: t('qa.task'), icon: 'tasks', onPress: () => openQuick('task') },
        ]}
      />

      <QuickAppointment
        open={quick === 'appt'}
        onClose={() => setQuick(null)}
        onCreated={() => { setQuick(null); reload() }}
      />
      <QuickTask
        open={quick === 'task'}
        onClose={() => setQuick(null)}
        onCreated={() => { setQuick(null); reload() }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { flex: 1, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  pad: { paddingHorizontal: 18 },
  switcher: { paddingBottom: 14 },
  banner: { marginTop: 12 },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
})
