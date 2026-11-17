import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Petit menu déroulant de la page projet : un bouton, un panneau qui se ferme au clic
 * extérieur, sur Échap et quand on choisit un élément (render prop `close`).
 */
export function PvDropdown({ button, btnClass = 'pv-btn ghost', label, align = 'left', children }: {
  button: ReactNode
  btnClass?: string
  label?: string
  align?: 'left' | 'right'
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  // Fermer après un choix rend le focus au bouton : une fenêtre ouverte ensuite y revient à sa fermeture.
  const close = () => { setOpen(false); btn.current?.focus() }
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="pv-dd" ref={box}>
      <button ref={btn} type="button" className={btnClass} aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}>{button}</button>
      {open && <div className={'pv-dd-panel' + (align === 'right' ? ' right' : '')} role="menu">{children(close)}</div>}
    </div>
  )
}
