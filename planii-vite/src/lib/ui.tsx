import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { initials } from './dates'
import { useDialog } from './useDialog'
import { useI18n } from './i18n'

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
  // The live region stays mounted so screen readers announce the text that appears in it (WCAG 4.1.3).
  return (
    <div role={msg?.err ? 'alert' : 'status'} aria-live={msg?.err ? 'assertive' : 'polite'} aria-atomic="true">
      {msg && (
        <div className="toast show" style={{ background: msg.err ? 'var(--danger)' : 'var(--text)', color: msg.err ? '#fff' : 'var(--bg)' }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

/* ---------- avatar ---------- */
export function Avatar({ name, size, src }: { name?: string; size?: number; src?: string | null }) {
  const style = size ? { width: size, height: size, fontSize: size / 2.6 } : undefined
  if (src) {
    return (
      <span className="avatar avatar-img" style={style}>
        <img src={src} alt={name || ''} />
      </span>
    )
  }
  return (
    <span className="avatar" style={style}>
      {initials(name)}
    </span>
  )
}

/* ---------- modal ---------- */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const { t: tr } = useI18n()
  const [max, setMax] = useState(false)
  const titleId = useId()
  const ref = useDialog<HTMLDivElement>(onClose)
  // Portal: an overlay rendered inside a sticky/transformed ancestor is trapped in its stacking context
  // (e.g. the notifications sheet fell under the mobile bottom nav).
  return createPortal(
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} className={'sheet' + (max ? ' max' : '')} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <h3 id={titleId}>{title}</h3>
          <div className="sheet-head-btns">
            <button className="sheet-ico" onClick={() => setMax((m) => !m)} aria-label={max ? tr('action.collapse') : tr('action.expand')} title={max ? tr('action.collapse') : tr('action.expand')}>
              {max
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>}
            </button>
            <button className="sheet-ico" onClick={onClose} aria-label={tr('action.close')} title={tr('action.close')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- helpers ---------- */
/** Black or white, whichever reads better (WCAG contrast) on a user-chosen `#rrggbb` background. */
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#fff'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#000' : '#fff'
}

export function health(taskCount: number, doneCount: number, status?: string) {
  const pct = taskCount ? Math.round(doneCount/taskCount*100) : 0
  return { pct: Math.max(pct, doneCount ? 6 : 0), done: doneCount, total: taskCount, color: status==='done' ? 'var(--ok)' : 'var(--accent)' }
}
