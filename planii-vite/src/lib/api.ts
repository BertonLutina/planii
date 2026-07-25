const API = (import.meta.env.VITE_API_URL as string) || 'https://api.planii.app/api'
const TKEY = 'planii.token'

export const getTok = () => localStorage.getItem(TKEY)
export const setTok = (t: string | null) => t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY)

/** Absolute URL for a stored `/uploads/...` path (or pass-through if already absolute). */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = API.replace(/\/$/, '')
  const rel = path.startsWith('/') ? path : '/' + path
  return base + rel
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getTok() ? { Authorization: 'Bearer ' + getTok() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: any = null
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok) throw new Error((data && data.error) || `Erreur ${res.status}`)
  return data as T
}

/** Multipart upload (do not set Content-Type — browser sets boundary). */
export async function apiUpload<T = any>(path: string, file: File, field = 'file'): Promise<T> {
  const fd = new FormData()
  fd.append(field, file)
  const res = await fetch(API + path, {
    method: 'POST',
    headers: {
      ...(getTok() ? { Authorization: 'Bearer ' + getTok() } : {}),
    },
    body: fd,
  })
  let data: any = null
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok) throw new Error((data && data.error) || `Erreur ${res.status}`)
  return data as T
}
