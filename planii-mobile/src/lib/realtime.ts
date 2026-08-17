import { useEffect, useRef } from 'react'
import { API, getTok } from './api'

/* Client WebSocket temps réel. Même contrat que le web : les messages du
   serveur sont rediffusés à tous les abonnés, avec reconnexion automatique. */

const WS_URL = API.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let stopped = false

export interface RtMessage { type: string; projectId?: string }

const listeners = new Set<(msg: RtMessage) => void>()

export function connectRealtime(): void {
  const tok = getTok()
  if (!tok || ws) return
  stopped = false
  try { ws = new WebSocket(WS_URL + '?token=' + encodeURIComponent(tok)) }
  catch { scheduleReconnect(); return }
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(String(e.data)) as RtMessage
      listeners.forEach((fn) => fn(msg))
    } catch { /* noop */ }
  }
  ws.onclose = () => { ws = null; if (!stopped) scheduleReconnect() }
  ws.onerror = () => { try { ws?.close() } catch { /* noop */ } }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => { if (!stopped) connectRealtime() }, 4000)
}

export function disconnectRealtime(): void {
  stopped = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  try { ws?.close() } catch { /* noop */ }
  ws = null
}

/* Le serveur diffuse à chaque écriture, à tous les membres du projet. Sur le
   web une seule vue est montée à la fois ; avec un navigateur à onglets, tous
   les écrans visités restent montés et réagissent ensemble — une case cochée
   par un collègue déclenchait ~8 requêtes, dont les deux routes les plus
   lourdes du serveur. On amortit donc : les messages reçus pendant la fenêtre
   sont fusionnés en un seul rafraîchissement. */
const RT_DEBOUNCE = 600

/** Abonne un composant aux messages temps réel (nettoyage automatique).
 *  `delay` à 0 pour réagir immédiatement (fil de discussion par exemple). */
export function useRealtime(handler: (msg: RtMessage) => void, delay = RT_DEBOUNCE): void {
  const ref = useRef(handler)
  ref.current = handler

  useEffect(() => {
    if (delay <= 0) {
      const fn = (msg: RtMessage) => ref.current(msg)
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    let pending: RtMessage | null = null
    const fn = (msg: RtMessage) => {
      pending = msg
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        const m = pending
        pending = null
        if (m) ref.current(m)
      }, delay)
    }
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
      if (timer) clearTimeout(timer)
    }
  }, [delay])
}
