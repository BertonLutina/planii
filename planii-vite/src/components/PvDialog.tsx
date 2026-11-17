import { useId, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDialog } from '@/lib/useDialog'
import { t as tt } from '@/lib/i18n'
import { Ic } from './Icon'

/**
 * Fenêtre de la page projet (Nouvelle tâche, Modifier la tâche).
 * Centrée sur grand écran, feuille qui monte du bas sur mobile ; clair et sombre via .pvm.
 */
export function PvDialog({ title, onClose, onSubmit, footer, children }: {
  title: string
  onClose: () => void
  onSubmit?: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  const titleId = useId()
  const ref = useDialog<HTMLDivElement>(onClose)
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit?.() }
  return createPortal(
    <div className="pvm pv-ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} className="pv-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <Shell onSubmit={onSubmit ? submit : undefined}>
        <div className="pv-mhd">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="pv-ib" onClick={onClose} aria-label={tt('action.close')} title={tt('action.close')}><Ic name="x" s={18} /></button>
        </div>
        <div className="pv-mbd">{children}</div>
        {footer && <div className="pv-mft">{footer}</div>}
        </Shell>
      </div>
    </div>,
    document.body,
  )
}

/** Un vrai <form> quand la fenêtre se valide (Entrée) ; sinon un simple conteneur. */
function Shell({ onSubmit, children }: { onSubmit?: (e: FormEvent) => void; children: ReactNode }) {
  return onSubmit
    ? <form className="pv-shell" onSubmit={onSubmit} noValidate>{children}</form>
    : <div className="pv-shell">{children}</div>
}
