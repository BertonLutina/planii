import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, getTok, hydrateTok, setTok, setUnauthorizedHandler } from './api'
import { authenticate, getLabel, isAvailable, isEnabled, setEnabled, shouldLockAtLaunch } from './biometrics'
import { connectRealtime, disconnectRealtime } from './realtime'
import {
  firstNameOf,
  gateRestoredSession,
  gateUnlock,
  shouldPersistBiometricChange,
} from './sessionGate'
import { t } from './i18n'
import type { User } from './types'

/* Session utilisateur — reprend le démarrage de `planii-vite/src/App.tsx` :
   jeton relu du trousseau → GET /me → succès : session ouverte + temps réel,
   échec : jeton effacé, retour à l'écran de connexion.

   Verrou biométrique : uniquement au démarrage à froid, et seulement si ce
   compte l'a activé et que l'appareil a une biométrie enregistrée. Le profil
   restauré reste dans `pending` ; `me` reste null tant que `authenticate`
   n'a pas réussi. Revenir de l'arrière-plan ne reverrouille pas.
   Une connexion active (mot de passe, OTP, OAuth, inscription) n'est jamais
   verrouillée. La déconnexion efface le verrou, pas la préférence. */

interface Ctx {
  /** Utilisateur connecté, `null` si aucune session ou si l'app est verrouillée. */
  me: User | null
  /** `true` tant que le démarrage n'a pas tranché. */
  loading: boolean
  /** Après une connexion réussie : mémorise le jeton et ouvre le temps réel. */
  signIn: (user: User, token: string) => void
  signOut: () => void
  /** Met à jour l'utilisateur en mémoire (réponse d'un PATCH /me). */
  update: (user: User) => void
  /** Plein écran de déverrouillage à la place du navigateur. */
  locked: boolean
  /** Prénom affiché sur l'écran de verrou. */
  lockedFirstName: string
  /** Biomètrie : en cas de succès, le profil en attente devient `me`. */
  unlock: () => Promise<boolean>
  biometricAvailable: boolean
  biometricLabel: string
  biometricEnabled: boolean
  /** `true` demande d'abord une biométrie réussie. `false` est enregistré tout de suite. */
  setBiometricEnabled: (enabled: boolean) => Promise<void>
  /** Vrai uniquement après un sign-in actif, jamais après une restauration. */
  justSignedIn: boolean
  /** Consomme le drapeau. `false` si l'offre a déjà été prise. */
  consumeJustSignedIn: () => boolean
}

const SessionCtx = createContext<Ctx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [lockedFirstName, setLockedFirstName] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLabel, setBiometricLabel] = useState('Biometric')
  const [biometricEnabled, setBiometricEnabledState] = useState(false)
  const [justSignedIn, setJustSignedIn] = useState(false)

  const meRef = useRef<User | null>(null)
  const pendingRef = useRef<User | null>(null)
  const lockedRef = useRef(false)
  const justRef = useRef(false)
  const labelRef = useRef('Biometric')
  const epoch = useRef(0)
  const unlocking = useRef(false)

  const publish = useCallback((user: User | null) => {
    meRef.current = user
    setMe(user)
  }, [])

  const rememberEnabled = useCallback((userId: string) => {
    void isEnabled(userId).then((on) => {
      if (meRef.current?.id === userId || pendingRef.current?.id === userId) {
        setBiometricEnabledState(on)
      }
    })
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [ok, label] = await Promise.all([
        isAvailable().catch(() => false),
        getLabel().catch(() => 'Biometric'),
      ])
      if (!alive) return
      labelRef.current = label
      setBiometricAvailable(ok)
      setBiometricLabel(label)
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await hydrateTok()
      if (!getTok()) {
        if (alive) { publish(null); setLocked(false); setLoading(false) }
        return
      }
      try {
        const r = await api<{ user: User }>('GET', '/me')
        if (!alive) return
        const lock = await shouldLockAtLaunch(r.user.id)
        if (!alive) return
        const gate = gateRestoredSession(r.user, lock)
        if (gate.kind === 'locked') {
          pendingRef.current = gate.pendingUser
          lockedRef.current = true
          setLocked(true)
          setLockedFirstName(gate.firstName)
          publish(null)
        } else if (gate.kind === 'open') {
          pendingRef.current = null
          lockedRef.current = false
          setLocked(false)
          setLockedFirstName('')
          publish(gate.user)
          connectRealtime()
        }
        rememberEnabled(r.user.id)
      } catch {
        /* `api` a déjà effacé le jeton si le serveur l'a refusé (401). Une
           panne réseau, elle, ne doit pas déconnecter : au démarrage hors
           ligne on garde le jeton et on retentera au prochain lancement. */
        if (alive) {
          pendingRef.current = null
          lockedRef.current = false
          setLocked(false)
          publish(null)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; disconnectRealtime() }
  }, [publish, rememberEnabled])

  const signOut = useCallback(() => {
    epoch.current += 1
    unlocking.current = false
    disconnectRealtime()
    setTok(null)
    pendingRef.current = null
    lockedRef.current = false
    justRef.current = false
    setLocked(false)
    setLockedFirstName('')
    setJustSignedIn(false)
    setBiometricEnabledState(false)
    publish(null)
  }, [publish])

  /* Jeton refusé en cours d'usage : on retombe sur l'écran de connexion.
     La préférence biométrique du compte reste en place. */
  useEffect(() => {
    setUnauthorizedHandler(() => { signOut() })
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const signIn = useCallback((user: User, token: string) => {
    epoch.current += 1
    setTok(token)
    pendingRef.current = null
    lockedRef.current = false
    justRef.current = true
    setLocked(false)
    setLockedFirstName('')
    setJustSignedIn(true)
    publish(user)
    connectRealtime()
    rememberEnabled(user.id)
  }, [publish, rememberEnabled])

  const update = useCallback((user: User) => {
    publish(user)
    if (pendingRef.current?.id === user.id) {
      pendingRef.current = user
      setLockedFirstName(firstNameOf(user))
    }
  }, [publish])

  const unlock = useCallback(async () => {
    if (unlocking.current || !lockedRef.current) return false
    const ticket = epoch.current
    unlocking.current = true
    try {
      const ok = await authenticate(t('bio.prompt'))
      const next = gateUnlock(pendingRef.current, ok)
      if (ticket !== epoch.current || !lockedRef.current) return false
      if (!next.user || next.locked) return false
      pendingRef.current = null
      lockedRef.current = false
      setLocked(false)
      setLockedFirstName('')
      publish(next.user)
      /* Les gardes (onglet admin, redirection hors de l'auth) relisent `me`. */
      connectRealtime()
      return true
    } catch {
      return false
    } finally {
      unlocking.current = false
    }
  }, [publish])

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    const id = meRef.current?.id ?? pendingRef.current?.id
    if (!id) return
    const authenticated = enabled
      ? await authenticate(t('bio.promptEnable', { label: labelRef.current || 'Biometric' }))
      : false
    if (!shouldPersistBiometricChange(enabled, authenticated)) return
    await setEnabled(id, enabled)
    if (meRef.current?.id === id || pendingRef.current?.id === id) {
      setBiometricEnabledState(enabled)
    }
  }, [])

  const consumeJustSignedIn = useCallback(() => {
    const was = justRef.current
    justRef.current = false
    setJustSignedIn(false)
    return was
  }, [])

  const value = useMemo<Ctx>(() => ({
    me, loading, signIn, signOut, update,
    locked, lockedFirstName, unlock,
    biometricAvailable, biometricLabel, biometricEnabled, setBiometricEnabled,
    justSignedIn, consumeJustSignedIn,
  }), [
    me, loading, signIn, signOut, update,
    locked, lockedFirstName, unlock,
    biometricAvailable, biometricLabel, biometricEnabled, setBiometricEnabled,
    justSignedIn, consumeJustSignedIn,
  ])

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession(): Ctx {
  const v = useContext(SessionCtx)
  if (!v) throw new Error('useSession doit être utilisé dans <SessionProvider>')
  return v
}
