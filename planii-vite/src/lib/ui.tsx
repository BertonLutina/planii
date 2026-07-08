import { useEffect, useState, type ReactNode } from 'react'
import { initials } from './dates'

/* ---------- toast bus ---------- */
type Toast = { text: string; err?: boolean }
let emit: (t: Toast) => void = () => {}
export const toast = (text: string) => emit({ text })
export const toastErr = (text: string) => emit({ text, err: true })

export function Toaster() {
  const [msg, setMsg] = useState<Toast | null>(null)
  useEffect(() => {
    emit = (t) => { setMsg(t); setTimeout(() => setMsg(null), 2600) }
    return () => { emit = () => {} }
  }, [])
  if (!msg) return null
  return (
    <div className="toast show" style={{ background: msg.err ? 'var(--danger)' : 'var(--text)', color: msg.err ? '#fff' : 'var(--bg)' }}>
      {msg.text}
    </div>
  )
}

/* ---------- avatar ---------- */
export function Avatar({ name, size }: { name?: string; size?: number }) {
  return (
    <span className="avatar" style={size ? { width: size, height: size, fontSize: size/2.6 } : undefined}>
      {initials(name)}
    </span>
  )
}

/* ---------- modal ---------- */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet"><h3>{title}</h3>{children}</div>
    </div>
  )
}

/* ---------- helpers ---------- */
export function health(taskCount: number, doneCount: number, status?: string) {
  const pct = taskCount ? Math.round(doneCount/taskCount*100) : 0
  return { pct: Math.max(pct, doneCount ? 6 : 0), done: doneCount, total: taskCount, color: status==='done' ? 'var(--ok)' : 'var(--accent)' }
}
