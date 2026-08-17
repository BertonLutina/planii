import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { api } from './api'
import { useRealtime } from './realtime'
import { useSession } from './session'
import type { Notification } from './types'

/* État partagé des notifications.
   Chaque onglet pose une <NotifBell /> dans son en-tête, et avec un navigateur
   à onglets tous les écrans visités restent montés : cinq cloches autonomes,
   c'était cinq minuteries et cinq `GET /notifications` par minute pour un
   compteur strictement identique. Une seule source ici, les cloches ne font
   plus que l'afficher.

   Le sondage s'arrête aussi quand l'app passe en arrière-plan — une minuterie
   qui tourne dans la poche ne sert qu'à vider la batterie. */

const POLL_MS = 60_000

interface Ctx {
  items: Notification[] | null
  unread: number
  error: string | null
  refreshing: boolean
  reload: () => Promise<void>
  refresh: () => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
}

const NotifCtx = createContext<Ctx | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { me } = useSession()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const reload = useCallback(async () => {
    if (!me) return
    try {
      const r = await api<{ notifications: Notification[]; unread: number }>('GET', '/notifications')
      if (!alive.current) return
      setItems(r.notifications)
      setUnread(r.unread)
      setError(null)
    } catch (e: any) {
      /* Silencieux tant que la feuille est fermée : une cloche qui crie une
         erreur réseau au démarrage n'aide personne. */
      if (!alive.current) return
      setItems((prev) => prev ?? [])
      setError(e?.message ?? null)
    }
  }, [me])

  /* Session fermée : on vide, sinon l'ancien compteur survit à la déconnexion. */
  useEffect(() => {
    if (me) { reload(); return }
    setItems(null); setUnread(0); setError(null)
  }, [me, reload])

  useEffect(() => {
    if (!me) return
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!timer) timer = setInterval(reload, POLL_MS) }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }

    start()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { reload(); start() } else stop()
    })
    return () => { stop(); sub.remove() }
  }, [me, reload])

  useRealtime((m) => { if (m.type === 'notif') reload() })

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await reload()
    if (alive.current) setRefreshing(false)
  }, [reload])

  const markAllRead = useCallback(async () => {
    setUnread(0)
    setItems((l) => (l ? l.map((n) => ({ ...n, read: true })) : l))
    try { await api('POST', '/notifications/read'); setError(null) }
    catch (e: any) { setError(e?.message ?? null); reload() }
  }, [reload])

  const remove = useCallback(async (id: string) => {
    let wasUnread = false
    setItems((l) => {
      if (!l) return l
      wasUnread = !l.find((n) => n.id === id)?.read
      return l.filter((n) => n.id !== id)
    })
    if (wasUnread) setUnread((n) => Math.max(0, n - 1))
    try { await api('DELETE', '/notifications/' + id); setError(null) }
    catch (e: any) { setError(e?.message ?? null); reload() }
  }, [reload])

  const value = useMemo<Ctx>(
    () => ({ items, unread, error, refreshing, reload, refresh, markAllRead, remove }),
    [items, unread, error, refreshing, reload, refresh, markAllRead, remove],
  )
  return <NotifCtx.Provider value={value}>{children}</NotifCtx.Provider>
}

export function useNotifications(): Ctx {
  const v = useContext(NotifCtx)
  if (!v) throw new Error('useNotifications doit être utilisé dans <NotificationsProvider>')
  return v
}
