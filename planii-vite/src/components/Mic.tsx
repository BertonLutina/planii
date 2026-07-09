import { useEffect, useRef, useState } from 'react'
import { listen, speechSupported, type Recognizer } from '@/lib/speech'
import { toastErr } from '@/lib/ui'

/** Bouton micro de dictée à poser à côté d'un champ texte.
 *  Ajoute le texte dicté à la valeur existante (append). */
export function Mic({ value, onChange, title = 'Dicter' }: { value: string; onChange: (v: string) => void; title?: string }) {
  const [rec, setRec] = useState(false)
  const ref = useRef<Recognizer | null>(null)
  const baseRef = useRef('')

  useEffect(() => () => ref.current?.stop(), [])

  function toggle() {
    if (!speechSupported()) { toastErr('Dictée non disponible sur ce navigateur'); return }
    if (rec) { ref.current?.stop(); return }
    baseRef.current = value ? value.replace(/\s+$/, '') + ' ' : ''
    setRec(true)
    ref.current = listen({
      onText: (t) => onChange((baseRef.current + t).replace(/\s+/g, ' ').replace(/^\s+/, '')),
      onEnd: () => setRec(false),
      onError: (e) => { setRec(false); if (e === 'unsupported') toastErr('Dictée non disponible sur ce navigateur') },
    })
  }

  if (!speechSupported()) return null
  return (
    <button type="button" className={'mic-btn' + (rec ? ' on' : '')} onClick={toggle} title={rec ? 'Arrêter' : title} aria-label={title}>
      {rec ? <span className="mic-pulse" /> : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      )}
    </button>
  )
}

/** Champ texte (input) avec bouton micro intégré. */
export function MicInput({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="mic-field">
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      <Mic value={value} onChange={onChange} />
    </div>
  )
}

/** Zone de texte (textarea) avec bouton micro intégré. */
export function MicTextarea({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  return (
    <div className="mic-field ta">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      <Mic value={value} onChange={onChange} />
    </div>
  )
}
