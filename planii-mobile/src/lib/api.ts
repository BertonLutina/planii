import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

/** Base URL de l'API. Surchargeable via app.json → expo.extra.apiUrl ou EXPO_PUBLIC_API_URL. */
export const API: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  ((Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl) ||
  'https://api.planii.app/api'

const TKEY = 'planii.token'

/* Le jeton est gardé en mémoire pour que les appels restent synchrones,
   et persisté dans le trousseau sécurisé de l'appareil. */
let token: string | null = null

/** Relit le jeton depuis le stockage sécurisé. À appeler une fois au démarrage. */
export async function hydrateTok(): Promise<string | null> {
  try { token = await SecureStore.getItemAsync(TKEY) } catch { token = null }
  return token
}

export const getTok = (): string | null => token

export function setTok(t: string | null): void {
  token = t
  if (t) SecureStore.setItemAsync(TKEY, t).catch(() => { /* ignore */ })
  else SecureStore.deleteItemAsync(TKEY).catch(() => { /* ignore */ })
}

/** URL absolue d'un chemin `/uploads/...` stocké (ou passe-plat si déjà absolue). */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = API.replace(/\/$/, '')
  const rel = path.startsWith('/') ? path : '/' + path
  return base + rel
}

/* Sur mobile le processus vit des semaines : un jeton expiré doit couper la
   session, sinon chaque écran affiche une erreur serveur sans autre issue que
   la déconnexion manuelle. La session s'abonne ici pour se vider elle-même. */
type Unauthorized = () => void
let onUnauthorized: Unauthorized | null = null

/** Branche la réaction à un 401. Appelé une fois par `SessionProvider`. */
export function setUnauthorizedHandler(fn: Unauthorized | null): void {
  onUnauthorized = fn
}

/** Vide la session dès que le serveur refuse le jeton. */
function checkAuth(status: number): void {
  if (status !== 401) return
  setTok(null)
  onUnauthorized?.()
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: any = null
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok) {
    checkAuth(res.status)
    throw new Error((data && data.error) || `Erreur ${res.status}`)
  }
  return data as T
}

export interface UploadFile { uri: string; name?: string; mimeType?: string }

/** Envoi multipart (photo de profil, image de projet). Ne pas fixer Content-Type. */
export async function apiUpload<T = any>(path: string, file: UploadFile, field = 'file'): Promise<T> {
  const name = file.name || file.uri.split('/').pop() || 'upload.jpg'
  const ext = name.split('.').pop()?.toLowerCase()
  const type = file.mimeType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg')
  const fd = new FormData()
  // @ts-expect-error — forme de fichier propre à React Native
  fd.append(field, { uri: file.uri, name, type })
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: fd,
  })
  let data: any = null
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok) {
    checkAuth(res.status)
    throw new Error((data && data.error) || `Erreur ${res.status}`)
  }
  return data as T
}
