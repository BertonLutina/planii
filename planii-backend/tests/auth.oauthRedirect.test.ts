import { describe, expect, it } from 'vitest'
import { safeRedirect } from '../src/routes/auth.routes'
import { env } from '../src/config/env'

/* La cible de retour OAuth vient du client : c'est une entrée non fiable.
   Si elle n'est pas filtrée, `/api/auth/google?redirect=https://evil.com`
   suffit à faire livrer un JWT valide à un tiers. Ces cas verrouillent le
   filtre — les tests ne touchent pas la base et tournent partout. */

describe('safeRedirect (retour OAuth)', () => {
  it('accepte le schéma natif de l’app', () => {
    expect(safeRedirect('planii://oauth')).toBe('planii://oauth')
  })

  it('accepte le web configuré, chemin et query compris', () => {
    const web = new URL(env.webUrl)
    expect(safeRedirect(`${web.origin}/`)).toBe(`${web.origin}/`)
    expect(safeRedirect(`${web.origin}/callback?x=1`)).toBe(`${web.origin}/callback?x=1`)
  })

  it('refuse un hôte tiers', () => {
    expect(safeRedirect('https://evil.com/steal')).toBeNull()
    expect(safeRedirect('//evil.com')).toBeNull()
  })

  it('refuse un schéma dangereux ou approchant', () => {
    expect(safeRedirect('javascript:alert(1)')).toBeNull()
    expect(safeRedirect('planii-evil://x')).toBeNull()
    expect(safeRedirect('data:text/html,<script>')).toBeNull()
  })

  it('refuse une valeur vide ou d’un autre type', () => {
    expect(safeRedirect('')).toBeNull()
    expect(safeRedirect(null)).toBeNull()
    expect(safeRedirect(undefined)).toBeNull()
    expect(safeRedirect(42)).toBeNull()
    expect(safeRedirect({ toString: () => 'planii://oauth' })).toBeNull()
  })

  it('n’ouvre `exp://` (Expo Go) qu’en dehors de la production', () => {
    const expo = 'exp://192.168.1.5:8081/--/oauth'
    expect(safeRedirect(expo)).toBe(env.isProd ? null : expo)
  })
})
