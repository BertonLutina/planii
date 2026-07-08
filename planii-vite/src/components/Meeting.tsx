import { useEffect, useRef } from 'react'
import type { Project, User } from '@/lib/types'

declare global { interface Window { JitsiMeetExternalAPI?: any } }

export function Meeting({ p, me, onClose }: { p: Project; me: User; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  useEffect(() => {
    let cancelled = false
    const start = () => {
      if (cancelled || !ref.current || !window.JitsiMeetExternalAPI) return
      try {
        apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: 'planii-' + p.id,
          parentNode: ref.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: me.name },
          configOverwrite: { prejoinPageEnabled: false },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        })
      } catch { /* ignore */ }
    }
    if (window.JitsiMeetExternalAPI) start()
    else {
      const s = document.createElement('script')
      s.src = 'https://meet.jit.si/external_api.js'; s.async = true; s.onload = start
      document.body.appendChild(s)
    }
    return () => { cancelled = true; try { apiRef.current?.dispose() } catch { /* ignore */ } }
  }, [p.id, me.name])
  return (
    <div className="meet">
      <div className="meet-bar">
        <span className="mt">🎥 Meeting — {p.name}</span>
        <button className="btn sm" onClick={onClose}>Quitter le meeting</button>
      </div>
      <div id="jitsi-container" ref={ref} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}
