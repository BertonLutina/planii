const API = (import.meta.env.VITE_API_URL as string) || 'https://api.planii.app/api'
const TKEY = 'planii.token'

export const getTok = () => localStorage.getItem(TKEY)
export const setTok = (t: string | null) => t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY)

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
