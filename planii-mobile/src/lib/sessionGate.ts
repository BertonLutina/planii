/** Décisions pures du verrou biométrique.
 *  La biométrie ne remplace pas la session : elle retient seulement le profil
 *  déjà restauré, au démarrage à froid, jusqu'à un `authenticate` réussi. */

export function firstNameOf(user: { firstName?: string | null; name?: string | null } | null | undefined): string {
  if (!user) return ''
  const first = user.firstName?.trim()
  if (first) return first
  const name = user.name?.trim() ?? ''
  if (!name) return ''
  return name.split(/\s+/)[0] ?? ''
}

export type RestoredGate<T> =
  | { kind: 'signed-out' }
  | { kind: 'open'; user: T }
  | { kind: 'locked'; pendingUser: T; firstName: string }

/** Restauration au froid. `shouldLock` est déjà `activé && matériel disponible`. */
export function gateRestoredSession<T extends { firstName?: string | null; name?: string | null }>(
  user: T | null,
  shouldLock: boolean,
): RestoredGate<T> {
  if (!user) return { kind: 'signed-out' }
  if (shouldLock) return { kind: 'locked', pendingUser: user, firstName: firstNameOf(user) }
  return { kind: 'open', user }
}

/** Succès : le profil en attente devient la session. Annulation : on reste verrouillé. */
export function gateUnlock<T>(pending: T | null, success: boolean): { user: T | null; locked: boolean } {
  if (success && pending) return { user: pending, locked: false }
  return { user: null, locked: pending != null }
}

/** Offre après une vraie connexion, une seule fois, et seulement si le matériel sait le faire. */
export function shouldOfferBiometrics(input: {
  justSignedIn: boolean
  available: boolean
  offered: boolean
}): boolean {
  return input.justSignedIn && input.available && !input.offered
}

/** Activer exige une biométrie réussie. Désactiver s'enregistre tout de suite. */
export function shouldPersistBiometricChange(enabled: boolean, authenticated: boolean): boolean {
  return enabled ? authenticated : true
}
