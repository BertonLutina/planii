import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { applyTheme } from '@/lib/theme'
import type { ProjectSummary } from '@/lib/types'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '')
/** Étiquette du raccourci selon la plateforme (⌘K sur Mac, Ctrl K ailleurs). */
export const CMD_LABEL = isMac ? '⌘K' : 'Ctrl K'

type Item = { icon: string; label: string; run: () => void }

export function CommandPalette({ open, onClose, setTab, openProject, newProject }: {
  open: boolean
  onClose: () => void
  setTab: (t: 'accueil' | 'projets' | 'calendrier' | 'classement' | 'profil') => void
  openProject: (id: string) => void
  newProject: () => void
}) {
  const [q, setQ] = useState('')
  const [projects, setProjects] = useState<ProjectSummary[]>([])

  useEffect(() => {
    if (!open) return
    setQ('')
    api<{ projects: ProjectSummary[] }>('GET', '/projects').then((r) => setProjects(r.projects)).catch(() => {})
  }, [open])

  if (!open) return null

  const go = (fn: () => void) => { onClose(); fn() }
  const items: Item[] = [
    { icon: '🏠', label: 'Aller à l’Accueil', run: () => setTab('accueil') },
    { icon: '📁', label: 'Aller aux Projets', run: () => setTab('projets') },
    { icon: '📅', label: 'Ouvrir l’Agenda', run: () => setTab('calendrier') },
    { icon: '🏆', label: 'Voir le Classement', run: () => setTab('classement') },
    { icon: '👤', label: 'Mon profil', run: () => setTab('profil') },
    { icon: '＋', label: 'Créer un projet', run: newProject },
    { icon: '☀️', label: 'Thème clair', run: () => applyTheme('light') },
    { icon: '🌙', label: 'Thème sombre', run: () => applyTheme('dark') },
    { icon: '🖥️', label: 'Thème auto (système)', run: () => applyTheme('auto') },
    ...projects.map((p) => ({ icon: '📂', label: 'Ouvrir : ' + p.name, run: () => openProject(p.id) })),
  ]
  const nq = q.trim().toLowerCase()
  const filtered = nq ? items.filter((it) => it.label.toLowerCase().includes(nq)) : items

  return (
    <div className="cmd-ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmd">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une action, un projet…"
          onKeyDown={(e) => { if (e.key === 'Enter' && filtered[0]) go(filtered[0].run); if (e.key === 'Escape') onClose() }} />
        <div className="cmd-list">
          {filtered.length === 0 && <div className="cmd-empty">Aucun résultat</div>}
          {filtered.slice(0, 8).map((it, i) => (
            <button key={i} className="cmd-row" onClick={() => go(it.run)}><span className="ci">{it.icon}</span>{it.label}</button>
          ))}
        </div>
        <div className="cmd-foot"><span className="kbd">{CMD_LABEL}</span> pour ouvrir · <span className="kbd">Échap</span> pour fermer</div>
      </div>
    </div>
  )
}
