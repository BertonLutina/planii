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
  const [max, setMax] = useState(false)
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'sheet' + (max ? ' max' : '')}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <div className="sheet-head-btns">
            <button className="sheet-ico" onClick={() => setMax((m) => !m)} aria-label={max ? 'Réduire' : 'Agrandir'} title={max ? 'Réduire' : 'Agrandir'}>
              {max
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>}
            </button>
            <button className="sheet-ico" onClick={onClose} aria-label="Fermer" title="Fermer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */
export function health(taskCount: number, doneCount: number, status?: string) {
  const pct = taskCount ? Math.round(doneCount/taskCount*100) : 0
  return { pct: Math.max(pct, doneCount ? 6 : 0), done: doneCount, total: taskCount, color: status==='done' ? 'var(--ok)' : 'var(--accent)' }
}
