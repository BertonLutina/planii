import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toast, toastErr } from '@/lib/ui'
import { PRIORITIES } from '@/lib/priority'
import type { ProjectSummary, User } from '@/lib/types'

/** Ajout rapide d'une tâche (avec priorité), depuis le “+” / “Nouveau”. */
export function QuickTask({ me, onClose, onCreated }: { me: User; onClose: () => void; onCreated: () => void }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [f, setF] = useState({ projectId: '', title: '', priority: 6, due: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ projects: ProjectSummary[] }>('GET', '/projects')
      .then((r) => { const active = r.projects.filter((p) => p.status !== 'done'); setProjects(active); if (active[0]) setF((v) => ({ ...v, projectId: active[0].id })) })
      .catch((e) => toastErr(e.message))
  }, [])

  async function create() {
    if (!f.title.trim()) return
    if (!f.projectId) { toastErr('Choisis un projet'); return }
    setBusy(true)
    try {
      await api('POST', '/projects/' + f.projectId + '/tasks', { title: f.title.trim(), priority: f.priority, due: f.due || null, assigneeId: me.id })
      toast('Tâche créée ✓'); onCreated()
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }

  return (
    <Modal title="Nouvelle tâche" onClose={onClose}>
      {projects && projects.length === 0 ? (
        <div className="empty" style={{ padding: '12px 0' }}>Crée d'abord un projet pour pouvoir y ajouter des tâches.</div>
      ) : (
        <>
          <div className="field"><label>Intitulé</label>
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex. Relire le chapitre 4" autoFocus /></div>
          <div className="field"><label>Projet</label>
            <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="field"><label>Priorité</label>
            <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={f.priority === n ? 'on o' + n : ''} onClick={() => setF({ ...f, priority: n })}>P{n}</button>)}</div></div>
          <div className="field"><label>Échéance</label>
            <input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <div className="sheet-actions">
            <button className="btn primary" disabled={busy} onClick={create}>Créer</button>
            <button className="btn ghost" onClick={onClose}>Annuler</button>
          </div>
        </>
      )}
    </Modal>
  )
}
