import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { applyTheme } from '@/lib/theme'
import type { ProjectSummary } from '@/lib/types'
import { Ic } from './Icon'
import { useI18n } from '@/lib/i18n'

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
  const { t: tr } = useI18n()
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
    { icon: 'home', label: tr('cmd.home'), run: () => setTab('accueil') },
    { icon: 'folder', label: tr('cmd.projects'), run: () => setTab('projets') },
    { icon: 'calendar-days', label: tr('cmd.agenda'), run: () => setTab('calendrier') },
    { icon: 'trophy', label: tr('cmd.leaderboard'), run: () => setTab('classement') },
    { icon: 'user', label: tr('cmd.profile'), run: () => setTab('profil') },
    { icon: 'plus', label: tr('cmd.newProject'), run: newProject },
    { icon: 'sun', label: tr('cmd.light'), run: () => applyTheme('light') },
    { icon: 'moon', label: tr('cmd.dark'), run: () => applyTheme('dark') },
    { icon: 'monitor', label: tr('cmd.auto'), run: () => applyTheme('auto') },
    ...projects.map((p) => ({ icon: 'folder', label: tr('cmd.open') + p.name, run: () => openProject(p.id) })),
  ]
  const nq = q.trim().toLowerCase()
  const filtered = nq ? items.filter((it) => it.label.toLowerCase().includes(nq)) : items

  return (
    <div className="cmd-ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmd">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tr('cmd.placeholder')}
          onKeyDown={(e) => { if (e.key === 'Enter' && filtered[0]) go(filtered[0].run); if (e.key === 'Escape') onClose() }} />
        <div className="cmd-list">
          {filtered.length === 0 && <div className="cmd-empty">{tr('cmd.noResult')}</div>}
          {filtered.slice(0, 8).map((it, i) => (
            <button key={i} className="cmd-row" onClick={() => go(it.run)}><span className="ci"><Ic name={it.icon} s={16} c="var(--accent)" /></span>{it.label}</button>
          ))}
        </div>
        <div className="cmd-foot"><span className="kbd">{CMD_LABEL}</span> {tr('cmd.toOpen')} · <span className="kbd">Échap</span> {tr('cmd.toClose')}</div>
      </div>
    </div>
  )
}
