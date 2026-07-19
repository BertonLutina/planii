import { useEffect, useState } from 'react'
import { Modal } from '@/lib/ui'
import { useI18n, t as tt } from '@/lib/i18n'
import { Ic } from './Icon'

/* ---- Contenu du guide, par page ---- */
type TourStep = { sel: string[]; title: string; text: string }
type PageGuide = { title: string; intro: string; points: string[]; tour: TourStep[] }

const NAV_SEL = ['.bottomnav', '.side-nav']
const FAB_SEL = ['.fab', '.newbtn']

/** Définition structurelle du guide : sélecteurs + nombre de points.
 *  Tous les textes viennent de lib/i18n (clés g.<page>.*), donc traduits dans les 9 langues. */
const GUIDE_DEF: Record<string, { pts: number; tour: string[][] }> = {
  accueil: { pts: 4, tour: [['.today-board', '.wrap'], ['.appbar-views'], NAV_SEL, FAB_SEL] },
  projets: { pts: 4, tour: [['.proj-viewseg'], ['.list-tools'], ['.pcard', '.ptable', '.wrap'], FAB_SEL] },
  calendrier: { pts: 3, tour: [['.wrap'], FAB_SEL] },
  classement: { pts: 3, tour: [['.wrap'], NAV_SEL] },
  profil: { pts: 3, tour: [['.wrap']] },
  admin: { pts: 3, tour: [['.admin-seg', '.wrap']] },
}

function guideOf(tab: string): PageGuide | null {
  const def = GUIDE_DEF[tab]
  if (!def) return null
  return {
    title: tt(`g.${tab}.title`),
    intro: tt(`g.${tab}.intro`),
    points: Array.from({ length: def.pts }, (_, i) => tt(`g.${tab}.p${i + 1}`)),
    tour: def.tour.map((sel, i) => ({ sel, title: tt(`g.${tab}.s${i + 1}t`), text: tt(`g.${tab}.s${i + 1}x`) })),
  }
}

/* ---- Bouton d’aide + panneau (par page) ---- */
export function HelpButton({ tab }: { tab: string }) {
  const { t: tr } = useI18n()
  const [open, setOpen] = useState(false)
  const [tour, setTour] = useState(false)
  const g = guideOf(tab)
  if (!g) return null
  return (
    <>
      <button className="help-btn" aria-label={tr('common.help')} title={tr('common.help')} onClick={() => setOpen(true)}>
        <Ic name="help" s={19} />
      </button>
      {open && (
        <Modal title={g.title} onClose={() => setOpen(false)}>
          <p className="sub" style={{ marginTop: 0 }}>{g.intro}</p>
          <ul className="guide-list">
            {g.points.map((p, i) => <li key={i}><Ic name="check" s={15} c="var(--accent)" /><span>{p}</span></li>)}
          </ul>
          {g.tour.length > 0 && (
            <button className="btn primary block" style={{ marginTop: 6 }} onClick={() => { setOpen(false); setTour(true) }}>
              <Ic name="sparkles" s={16} /> {tr('guide.launch')}
            </button>
          )}
        </Modal>
      )}
      {tour && g.tour.length > 0 && <Tour steps={g.tour} onClose={() => setTour(false)} />}
    </>
  )
}

/* ---- Visite interactive (coach marks avec spotlight) ---- */
function firstVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const els = Array.from(document.querySelectorAll<HTMLElement>(sel))
    const vis = els.find((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0)
    if (vis) return vis
  }
  return null
}

function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = steps[i]
  const last = i === steps.length - 1

  useEffect(() => {
    let raf = 0
    const measure = () => {
      const el = firstVisible(step.sel)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    const el = firstVisible(step.sel)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const t = setTimeout(() => { measure(); raf = requestAnimationFrame(measure) }, 280)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [i, step.sel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setI((n) => Math.min(steps.length - 1, n + 1))
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps.length, onClose])

  const pad = 6
  const vw = window.innerWidth, vh = window.innerHeight
  const tipW = Math.min(320, vw - 24)
  // Position de la bulle : sous la cible si possible, sinon au-dessus, sinon centrée.
  let tipTop = vh / 2 - 90, tipLeft = vw / 2 - tipW / 2
  if (rect) {
    const below = rect.bottom + 14
    const above = rect.top - 14
    if (below + 170 < vh) tipTop = below
    else if (above - 170 > 0) tipTop = above - 170
    else tipTop = Math.min(vh - 180, Math.max(12, rect.bottom + 14))
    tipLeft = Math.min(vw - tipW - 12, Math.max(12, rect.left + rect.width / 2 - tipW / 2))
  }

  return (
    <div className="tour-root" role="dialog" aria-modal="true">
      <div className="tour-backdrop" onClick={(e) => e.stopPropagation()} />
      {rect && (
        <div className="tour-spot" style={{
          left: rect.left - pad, top: rect.top - pad,
          width: rect.width + pad * 2, height: rect.height + pad * 2,
        }} />
      )}
      <div className="tour-tip" style={{ top: tipTop, left: tipLeft, width: tipW }}>
        <div className="tour-step-n">{tt('vw.step')} {i + 1} / {steps.length}</div>
        <div className="tour-tip-title">{step.title}</div>
        <p className="tour-tip-text">{step.text}</p>
        <div className="tour-actions">
          <button className="btn ghost sm" onClick={onClose}>{tt('guide.quit')}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn sm" onClick={() => setI(i - 1)}><Ic name="chevron-left" s={15} /> {tt('guide.prev')}</button>}
            {last
              ? <button className="btn primary sm" onClick={onClose}>{tt('guide.finish')}</button>
              : <button className="btn primary sm" onClick={() => setI(i + 1)}>{tt('guide.next')} <Ic name="chevron-right" s={15} /></button>}
          </div>
        </div>
      </div>
    </div>
  )
}
