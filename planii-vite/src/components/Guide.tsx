import { useEffect, useState } from 'react'
import { Modal } from '@/lib/ui'
import { Ic } from './Icon'

/* ---- Contenu du guide, par page ---- */
type TourStep = { sel: string[]; title: string; text: string }
type PageGuide = { title: string; intro: string; points: string[]; tour: TourStep[] }

const NAV_SEL = ['.bottomnav', '.side-nav']
const FAB_SEL = ['.fab', '.newbtn']

export const GUIDES: Record<string, PageGuide> = {
  accueil: {
    title: 'Accueil — ton tableau du jour',
    intro: 'L’accueil rassemble tout ce qui demande ton attention aujourd’hui, tous projets confondus.',
    points: [
      'Les tuiles du haut regroupent tes tâches : en retard, à faire aujourd’hui, priorités fortes, à valider…',
      'En haut à droite, change l’affichage : Liste, Tableau (kanban) ou Agenda.',
      'La liste « À faire » en dessous te montre tes prochaines tâches, triées par priorité puis par date.',
      'Le bouton + (mobile) crée un nouveau projet depuis n’importe quelle page.',
    ],
    tour: [
      { sel: ['.today-board', '.wrap'], title: 'Ton tableau du jour', text: 'Chaque tuile colorée regroupe une catégorie : en retard, à faire, priorités… Un coup d’œil suffit.' },
      { sel: ['.appbar-views'], title: 'Changer d’affichage', text: 'Bascule entre Liste, Tableau et Agenda selon ta préférence.' },
      { sel: NAV_SEL, title: 'Naviguer', text: 'Passe d’une section à l’autre : Accueil, Projets, Agenda, Classement, Profil.' },
      { sel: FAB_SEL, title: 'Créer', text: 'Le bouton + crée un projet. Sur l’agenda, il propose un rendez-vous ou une tâche.' },
    ],
  },
  projets: {
    title: 'Projets — tes espaces de travail',
    intro: 'Un projet regroupe des tâches, des membres, des rôles et une messagerie. Trois types : 1-à-1, équipe, groupe.',
    points: [
      'Bascule entre la vue Cartes (visuelle) et la vue Tableau (comparative) en haut à gauche.',
      'Trie tes projets par titre ou manuellement (glisser-déposer en vue Cartes).',
      'Clique sur un projet pour l’ouvrir : tâches, rôles, réunion, rendez-vous, sondages.',
      '« Rejoindre un projet » te permet d’entrer via un lien d’invitation.',
    ],
    tour: [
      { sel: ['.proj-viewseg'], title: 'Cartes ou Tableau', text: 'Vue Cartes pour un aperçu visuel, vue Tableau pour comparer beaucoup de projets d’un coup d’œil.' },
      { sel: ['.list-tools'], title: 'Trier', text: 'Trie par titre, ou passe en mode manuel pour ranger tes projets par glisser-déposer.' },
      { sel: ['.pcard', '.ptable', '.wrap'], title: 'Ouvrir un projet', text: 'Clique sur un projet pour accéder à ses tâches, ses membres et ses outils.' },
      { sel: FAB_SEL, title: 'Nouveau projet', text: 'Crée un projet et choisis son type : 1-à-1, équipe ou groupe.' },
    ],
  },
  calendrier: {
    title: 'Agenda — tes échéances et rendez-vous',
    intro: 'L’agenda réunit les dates de tes tâches et tes rendez-vous, tous projets confondus.',
    points: [
      'Visualise tes échéances par mois, semaine ou année.',
      'Le bouton + (mobile) ouvre un choix : créer un rendez-vous ou une tâche.',
      'Un rendez-vous est rattaché à un projet et notifie les participants par e-mail.',
    ],
    tour: [
      { sel: ['.wrap'], title: 'Ta vue d’ensemble', text: 'Toutes tes échéances et tes rendez-vous réunis au même endroit.' },
      { sel: FAB_SEL, title: 'Créer', text: 'Sur l’agenda, le + propose de créer un rendez-vous ou une tâche.' },
    ],
  },
  classement: {
    title: 'Classement — la motivation d’équipe',
    intro: 'Chaque tâche cochée rapporte des points. Le classement récompense les équipes les plus régulières.',
    points: [
      'Barème : en avance 20 pts · le jour même 15 pts · en retard 5 pts.',
      'La meilleure équipe reçoit un bonus.',
      'Coche tes tâches pour faire grimper ton projet dans le classement.',
    ],
    tour: [
      { sel: ['.wrap'], title: 'Le classement', text: 'Les projets sont classés par points. Coche tes tâches pour grimper.' },
      { sel: NAV_SEL, title: 'Reviens quand tu veux', text: 'Le classement se met à jour en temps réel à chaque tâche terminée.' },
    ],
  },
  profil: {
    title: 'Profil — tes préférences',
    intro: 'Gère ton identité, ton métier, tes types de tâches et ta bibliothèque de rôles réutilisables.',
    points: [
      'Modifie ton nom, ton e-mail et ton métier.',
      'Personnalise tes types de tâches (par défaut : Tâche, Bug) et ta bibliothèque de rôles.',
      'Change le thème : clair, sombre ou automatique.',
    ],
    tour: [
      { sel: ['.wrap'], title: 'Tes informations', text: 'Mets à jour ton profil, tes types de tâches et tes rôles réutilisables.' },
    ],
  },
  admin: {
    title: 'Espace admin',
    intro: 'Tableau de bord d’administration : statistiques, utilisateurs, projets, et boîte mail (super-admin).',
    points: [
      'Le tableau de bord montre les chiffres clés et des graphiques.',
      'Gère les utilisateurs et les projets, consulte le journal d’audit.',
      'La boîte mail (super-admin) permet de lire et répondre aux e-mails du support.',
    ],
    tour: [
      { sel: ['.admin-seg', '.wrap'], title: 'Les sections', text: 'Navigue entre Tableau de bord, Utilisateurs, Tâches, Projets et la boîte mail.' },
    ],
  },
}

/* ---- Bouton d’aide + panneau (par page) ---- */
export function HelpButton({ tab }: { tab: string }) {
  const [open, setOpen] = useState(false)
  const [tour, setTour] = useState(false)
  const g = GUIDES[tab]
  if (!g) return null
  return (
    <>
      <button className="help-btn" aria-label="Aide sur cette page" title="Aide sur cette page" onClick={() => setOpen(true)}>
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
              <Ic name="sparkles" s={16} /> Lancer la visite guidée
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
        <div className="tour-step-n">Étape {i + 1} / {steps.length}</div>
        <div className="tour-tip-title">{step.title}</div>
        <p className="tour-tip-text">{step.text}</p>
        <div className="tour-actions">
          <button className="btn ghost sm" onClick={onClose}>Quitter</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn sm" onClick={() => setI(i - 1)}><Ic name="chevron-left" s={15} /> Précédent</button>}
            {last
              ? <button className="btn primary sm" onClick={onClose}>Terminer</button>
              : <button className="btn primary sm" onClick={() => setI(i + 1)}>Suivant <Ic name="chevron-right" s={15} /></button>}
          </div>
        </div>
      </div>
    </div>
  )
}
