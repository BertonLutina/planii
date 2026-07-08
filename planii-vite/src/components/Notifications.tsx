import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toastErr } from '@/lib/ui'
import type { Notification } from '@/lib/types'

const ICON: Record<string, string> = {
  project_deleted: '🗑',
  project_updated: '✏️',
}

export function NotifBell() {
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api<{ notifications: Notification[]; unread: number }>('GET', '/notifications')
      setItems(r.notifications); setUnread(r.unread)
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  async function openPanel() {
    setOpen(true)
    if (unread > 0) {
      try { await api('POST', '/notifications/read'); setUnread(0); setItems((l) => l.map((n) => ({ ...n, read: true }))) } catch { /* ignore */ }
    }
  }
  async function clearOne(id: string) {
    try { await api('DELETE', '/notifications/' + id); setItems((l) => l.filter((n) => n.id !== id)) } catch (e: any) { toastErr(e.message) }
  }

  return (
    <>
      <button className="notif-btn" onClick={openPanel} aria-label="Notifications" title="Notifications">
        🔔{unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <Modal title="Notifications" onClose={() => setOpen(false)}>
          {items.length === 0 && <div className="empty" style={{ padding: '18px 0' }}>Aucune notification.</div>}
          {items.map((n) => (
            <div key={n.id} className={'notif-row' + (n.read ? '' : ' unread')}>
              <span className="notif-ico">{ICON[n.type] || '🔔'}</span>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="sub">{n.detail}</div>
                <div className="sub" style={{ fontSize: '11.5px' }}>{new Date(n.at).toLocaleString('fr-FR')}</div>
              </div>
              <button className="notif-x" onClick={() => clearOne(n.id)} aria-label="Effacer">✕</button>
            </div>
          ))}
        </Modal>
      )}
    </>
  )
}
