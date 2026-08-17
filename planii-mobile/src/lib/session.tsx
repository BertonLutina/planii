import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getTok, hydrateTok, setTok, setUnauthorizedHandler } from './api'
import { connectRealtime, disconnectRealtime } from './realtime'
import type { User } from './types'

/* Session utilisateur — reprend le démarrage de `planii-vite/src/App.tsx` :
   jeton relu du trousseau → GET /me → succès : session ouverte + temps réel,
   échec : jeton effacé, retour à l'écran de connexion. */

interface Ctx {
  /** Utilisateur connecté, `null` si aucune session. */
  me: User | null
  /** `true` tant que le démarrage n'a pas tranché. */
  loading: boolean
  /** Après une connexion réussie : mémorise le jeton et ouvre le temps réel. */
  signIn: (user: User, token: string) => void
  signOut: () => void
  /** Met à jour l'utilisateur en mémoire (réponse d'un PATCH /me). */
  update: (user: User) => void
}

const SessionCtx = createContext<Ctx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await hydrateTok()
      if (!getTok()) { if (alive) { setMe(null); setLoading(false) } ; return }
      try {
        const r = await api<{ user: User }>('GET', '/me')
        if (!alive) return
        setMe(r.user)
        connectRealtime()
      } catch {
        /* `api` a déjà effacé le jeton si le serveur l'a refusé (401). Une
           panne réseau, elle, ne doit pas déconnecter : au démarrage hors
           ligne on garde le jeton et on retentera au prochain lancement. */
        if (alive) setMe(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; disconnectRealtime() }
  }, [])

  /* Jeton refusé en cours d'usage : on retombe sur l'écran de connexion au
     lieu de laisser chaque écran afficher une erreur serveur. */
  useEffect(() => {
    setUnauthorizedHandler(() => { disconnectRealtime(); setMe(null) })
    return () => setUnauthorizedHandler(null)
  }, [])

  const signIn = useCallback((user: User, token: string) => {
    setTok(token)
    setMe(user)
    connectRealtime()
  }, [])

  const signOut = useCallback(() => {
    disconnectRealtime()
    setTok(null)
    setMe(null)
  }, [])

  const update = useCallback((user: User) => setMe(user), [])

  const value = useMemo<Ctx>(() => ({ me, loading, signIn, signOut, update }), [me, loading, signIn, signOut, update])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession(): Ctx {
  const v = useContext(SessionCtx)
  if (!v) throw new Error('useSession doit être utilisé dans <SessionProvider>')
  return v
}
