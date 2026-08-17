import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { API, api, setTok } from '@/lib/api'
import type { User } from '@/lib/types'

/* Connexion par fournisseur externe.
   Sur le web, `Auth.tsx` change simplement `window.location` vers
   `GET /auth/<provider>` ; le serveur renvoie ensuite sur l'app avec
   `?oauth_token=…`. Sur mobile, on ouvre la même URL dans une session
   d'authentification système (onglet Safari/Chrome Custom Tab, cookies isolés,
   pas de navigateur détourné), et on attend le retour sur `planii://`. */

WebBrowser.maybeCompleteAuthSession()

export type ProviderKey = 'google' | 'microsoft' | 'linkedin' | 'yahoo'
export type Providers = Partial<Record<ProviderKey, boolean>>

export const PROVIDER_ORDER: ProviderKey[] = ['google', 'microsoft', 'linkedin', 'yahoo']

export const PROVIDER_LABEL: Record<ProviderKey, string> = {
  google: 'auth.continueGoogle',
  microsoft: 'auth.continueMicrosoft',
  linkedin: 'auth.continueLinkedin',
  yahoo: 'auth.continueYahoo',
}

/** Fournisseurs réellement configurés côté serveur. */
export function listProviders(): Promise<Providers> {
  return api<Providers>('GET', '/auth/providers')
}

/** Lit un paramètre dans la query *ou* le fragment de l'URL de retour. */
function paramOf(url: string, key: string): string | null {
  const m = url.match(new RegExp('[?&#]' + key + '=([^&#]+)'))
  return m ? decodeURIComponent(m[1]) : null
}

export interface OAuthResult { user: User; token: string }

/** Ouvre le fournisseur et résout la session. `null` = l'utilisateur a annulé. */
export async function signInWithProvider(provider: ProviderKey): Promise<OAuthResult | null> {
  /* `planii://oauth` en build autonome, `exp://…/--/oauth` sous Expo Go. */
  const redirect = Linking.createURL('oauth')
  const base = API.replace(/\/$/, '')
  const url = `${base}/auth/${provider}?redirect=${encodeURIComponent(redirect)}&platform=mobile`

  const res = await WebBrowser.openAuthSessionAsync(url, redirect)
  if (res.type !== 'success' || !res.url) return null

  if (paramOf(res.url, 'authError')) throw new Error('La connexion a échoué. Réessaie ou utilise ton e-mail.')

  const token = paramOf(res.url, 'oauth_token')
  if (!token) throw new Error('Réponse de connexion incomplète. Réessaie ou utilise ton e-mail.')

  /* Le jeton est posé avant l'appel : `GET /me` a besoin de l'en-tête. */
  setTok(token)
  try {
    const r = await api<{ user: User }>('GET', '/me')
    return { user: r.user, token }
  } catch (e) {
    setTok(null)
    throw e
  }
}
