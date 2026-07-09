import { useEffect, useRef } from 'react'
import { getTok } from './api'

/* Client WebSocket temps réel : se connecte à l'API, rediffuse les messages
   du serveur via un événement DOM « planii:rt » que les composants écoutent
   pour se rafraîchir automatiquement. Reconnexion automatique. */

const API = (import.meta.env.VITE_API_URL as string) || 'https://api.planii.app/api'
const WS_URL = API.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let stopped = false

export interface RtMessage { type: string; projectId?: string }

export function connectRealtime() {
  const tok = getTok()
  if (!tok) return
  stopped = false
  try { ws = new WebSocket(WS_URL + '?token=' + encodeURIComponent(tok)) }
  catch { scheduleReconnect(); return }
  ws.onmessage = (e) => {
    try { window.dispatchEvent(new CustomEvent('planii:rt', { detail: JSON.parse(e.data) })) } catch { /* noop */ }
  }
  ws.onclose = () => { ws = null; if (!stopped) scheduleReconnect() }
  ws.onerror = () => { try { ws?.close() } catch { /* noop */ } }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => { if (!stopped) connectRealtime() }, 4000)
}

export function disconnectRealtime() {
  stopped = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  try { ws?.close() } catch { /* noop */ }
  ws = null
}

/** Abonne un composant aux messages temps réel (nettoyage automatique). */
export function useRealtime(handler: (msg: RtMessage) => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const h = (e: Event) => ref.current((e as CustomEvent).detail as RtMessage)
    window.addEventListener('planii:rt', h)
    return () => window.removeEventListener('planii:rt', h)
  }, [])
}
