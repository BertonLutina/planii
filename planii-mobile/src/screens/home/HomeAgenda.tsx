import { StyleSheet, View } from 'react-native'
import { Banner, Button } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useRealtime } from '@/lib/realtime'
import { AgendaList } from '@/screens/agenda/AgendaList'
import { CalendarSkeleton } from '@/screens/agenda/CalendarSkeleton'
import { useCalendar } from '@/screens/agenda/useCalendar'

/* Vue « agenda » de l'accueil — le web y encastre `CalendarView` en entier.
   On réutilise ici exactement la liste de l'onglet Agenda plutôt que d'en
   écrire une seconde : mêmes données, même rendu, un seul endroit à corriger.
   La grille mensuelle reste réservée à l'onglet Agenda — sur l'accueil c'est
   « ce qui arrive » qui a du sens, pas la navigation dans les mois. */

export interface HomeAgendaProps {
  onOpen: (projectId: string) => void
  contentPaddingBottom?: number
}

export function HomeAgenda({ onOpen, contentPaddingBottom = 24 }: HomeAgendaProps) {
  const { events, error, refreshing, reload, refresh } = useCalendar(new Date().getFullYear())
  useRealtime((m) => { if (m.type === 'project' || m.type === 'notif') reload() })

  if (!events) {
    return <View style={s.pad}><CalendarSkeleton view="agenda" /></View>
  }

  if (error && events.length === 0) {
    return (
      <View style={s.pad}>
        <Banner tone="danger" icon="alert" text={error} />
        <Button label={t('ad.refresh')} icon="refresh" onPress={reload} style={s.retry} />
      </View>
    )
  }

  return (
    <AgendaList
      events={events}
      refreshing={refreshing}
      onRefresh={refresh}
      onOpen={onOpen}
      header={error ? <Banner tone="danger" icon="alert" text={error} style={s.banner} /> : null}
      contentPaddingBottom={contentPaddingBottom}
    />
  )
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 18 },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
  banner: { marginTop: 12 },
})
