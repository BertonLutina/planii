import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toast, toastErr } from '@/lib/ui'
import { MicInput } from './Mic'
import type { ProjectSummary } from '@/lib/types'
import { useI18n } from '@/lib/i18n'

/** Création rapide d'un rendez-vous depuis l'agenda (choix du projet + date + horaires). */
export function QuickAppointment({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t: tr } = useI18n()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [f, setF] = useState({ projectId: '', title: '', date: '', timeStart: '', timeEnd: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ projects: ProjectSummary[] }>('GET', '/projects')
      .then((r) => { const a = r.projects.filter((p) => p.status !== 'done'); setProjects(a); if (a[0]) setF((v) => ({ ...v, projectId: a[0].id })) })
      .catch((e) => toastErr(e.message))
  }, [])

  async function create() {
    if (!f.projectId) { toastErr(tr('qt.pickProject')); return }
    if (!f.date || !f.timeStart || !f.timeEnd) { toastErr(tr('qa.needFields')); return }
    setBusy(true)
    try {
      await api('POST', '/projects/' + f.projectId + '/appointments', {
        title: f.title.trim() || null, date: f.date, timeStart: f.timeStart, timeEnd: f.timeEnd,
      })
      toast(tr('qa.created')); onCreated()
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }

  return (
    <Modal title={tr('qa.title')} onClose={onClose}>
      {projects && projects.length === 0 ? (
        <div className="empty" style={{ padding: '12px 0' }}>{tr('qa.needProject')}</div>
      ) : (
        <>
          <div className="field"><label>{tr('qa.optTitle')}</label>
            <MicInput value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Ex. Point d'avancement" autoFocus /></div>
          <div className="field"><label>{tr('qt.project')}</label>
            <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="field"><label>{tr('qa.date')}</label>
            <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>{tr('qa.start')}</label>
              <input type="time" value={f.timeStart} onChange={(e) => setF({ ...f, timeStart: e.target.value })} /></div>
            <div className="field"><label>{tr('qa.end')}</label>
              <input type="time" value={f.timeEnd} onChange={(e) => setF({ ...f, timeEnd: e.target.value })} /></div>
          </div>
          <div className="sheet-actions">
            <button className="btn primary" disabled={busy} onClick={create}>{tr('action.create')}</button>
            <button className="btn ghost" onClick={onClose}>{tr('action.cancel')}</button>
          </div>
        </>
      )}
    </Modal>
  )
}
