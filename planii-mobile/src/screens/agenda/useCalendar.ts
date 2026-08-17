import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { parseISO, todayMid } from '@/lib/dates'
import type { ApiCalEvent, CalEvent } from '@/lib/types'

/* Chargement du calendrier — même requête que le web : trois années glissantes
   autour de l'année courante, une seule fois par année affichée. */

export interface CalendarData {
  /** `null` tant que rien n'est arrivé (afficher un squelette). */
  events: CalEvent[] | null
  error: string | null
  refreshing: boolean
  reload: () => Promise<void>
  refresh: () => Promise<void>
}

export function useCalendar(year: number): CalendarData {
  const [events, setEvents] = useState<CalEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const reload = useCallback(async () => {
    try {
      const from = `${year - 1}-01-01`
      const to = `${year + 1}-12-31`
      const { events: raw } = await api<{ events: ApiCalEvent[] }>('GET', `/calendar?from=${from}&to=${to}`)
      const today = todayMid()
      setEvents(raw.flatMap((e) => {
        const d = parseISO(e.date)
        if (!d) return []
        const done = !!e.done
        return [{
          id: e.id,
          date: d,
          title: e.title,
          done,
          over: !e.deadline && !done && d < today,
          deadline: e.deadline,
          pid: e.projectId,
          pname: e.projectName,
        }]
      }))
      setError(null)
    } catch (e: any) {
      setEvents((prev) => prev ?? [])
      setError(e?.message ?? 'Erreur')
    }
  }, [year])

  useEffect(() => { reload() }, [reload])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await reload()
    setRefreshing(false)
  }, [reload])

  return { events, error, refreshing, reload, refresh }
}

/** Événements d'un jour, triés par titre — comme le web. */
export function eventsOfDay(events: CalEvent[], d: Date): CalEvent[] {
  return events
    .filter((e) => e.date.getFullYear() === d.getFullYear()
      && e.date.getMonth() === d.getMonth()
      && e.date.getDate() === d.getDate())
    .sort((a, b) => a.title.localeCompare(b.title))
}
