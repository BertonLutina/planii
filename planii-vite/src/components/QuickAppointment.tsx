import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toast, toastErr } from '@/lib/ui'
import { MicInput } from './Mic'
import type { ProjectSummary } from '@/lib/types'

/** Création rapide d'un rendez-vous depuis l'agenda (choix du projet + date + horaires). */
export function QuickAppointment({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [f, setF] = useState({ projectId: '', title: '', date: '', timeStart: '', timeEnd: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ projects: ProjectSummary[] }>('GET', '/projects')
      .then((r) => { const a = r.projects.filter((p) => p.status !== 'done'); setProjects(a); if (a[0]) setF((v) => ({ ...v, projectId: a[0].id })) })
      .catch((e) => toastErr(e.message))
  }, [])

  async function create() {
    if (!f.projectId) { toastErr('Choisis un projet'); return }
    if (!f.date || !f.timeStart || !f.timeEnd) { toastErr('Date et horaires requis'); return }
    setBusy(true)
    try {
      await api('POST', '/projects/' + f.projectId + '/appointments', {
        title: f.title.trim() || null, date: f.date, timeStart: f.timeStart, timeEnd: f.timeEnd,
      })
      toast('Rendez-vous créé ✓'); onCreated()
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }

  return (
    <Modal title="Nouveau rendez-vous" onClose={onClose}>
      {projects && projects.length === 0 ? (
        <div className="empty" style={{ padding: '12px 0' }}>Crée d'abord un projet pour pouvoir y ajouter un rendez-vous.</div>
      ) : (
        <>
          <div className="field"><label>Titre (optionnel)</label>
            <MicInput value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Ex. Point d'avancement" autoFocus /></div>
          <div className="field"><label>Projet</label>
            <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="field"><label>Date</label>
            <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Début</label>
              <input type="time" value={f.timeStart} onChange={(e) => setF({ ...f, timeStart: e.target.value })} /></div>
            <div className="field"><label>Fin</label>
              <input type="time" value={f.timeEnd} onChange={(e) => setF({ ...f, timeEnd: e.target.value })} /></div>
          </div>
          <div className="sheet-actions">
            <button className="btn primary" disabled={busy} onClick={create}>Créer</button>
            <button className="btn ghost" onClick={onClose}>Annuler</button>
          </div>
        </>
      )}
    </Modal>
  )
}
