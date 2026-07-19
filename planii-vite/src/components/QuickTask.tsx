import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toast, toastErr } from '@/lib/ui'
import { PRIORITIES } from '@/lib/priority'
import { taskTypesOf, typeTone } from '@/lib/tasktype'
import { MicInput } from './Mic'
import type { ProjectSummary, User } from '@/lib/types'
import { useI18n } from '@/lib/i18n'

/** Ajout rapide d'une tâche (avec priorité), depuis le “+” / “Nouveau”. */
export function QuickTask({ me, onClose, onCreated }: { me: User; onClose: () => void; onCreated: () => void }) {
  const { t: tr } = useI18n()
  const myTypes = taskTypesOf(me)
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [f, setF] = useState({ projectId: '', title: '', type: myTypes[0] || '', priority: 6, due: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ projects: ProjectSummary[] }>('GET', '/projects')
      .then((r) => { const active = r.projects.filter((p) => p.status !== 'done'); setProjects(active); if (active[0]) setF((v) => ({ ...v, projectId: active[0].id })) })
      .catch((e) => toastErr(e.message))
  }, [])

  async function create() {
    if (!f.title.trim()) return
    if (!f.projectId) { toastErr(tr('qt.pickProject')); return }
    setBusy(true)
    try {
      await api('POST', '/projects/' + f.projectId + '/tasks', { title: f.title.trim(), type: f.type || null, priority: f.priority, due: f.due || null, assigneeId: me.id })
      toast(tr('qt.created')); onCreated()
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }

  return (
    <Modal title={tr('qt.title')} onClose={onClose}>
      {projects && projects.length === 0 ? (
        <div className="empty" style={{ padding: '12px 0' }}>{tr('qt.needProject')}</div>
      ) : (
        <>
          <div className="field"><label>{tr('qt.label')}</label>
            <MicInput value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Ex. Relire le chapitre 4" autoFocus /></div>
          <div className="field"><label>{tr('qt.project')}</label>
            <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="field"><label>{tr('qt.type')}</label>
            <div className="type-pick">
              <button className={f.type === '' ? 'on' : ''} onClick={() => setF({ ...f, type: '' })}>Aucun</button>
              {myTypes.map((t) => <button key={t} className={f.type === t ? 'on ' + typeTone(t) : ''} onClick={() => setF({ ...f, type: t })}>{t}</button>)}
            </div></div>
          <div className="field"><label>{tr('qt.priority')}</label>
            <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={f.priority === n ? 'on o' + n : ''} onClick={() => setF({ ...f, priority: n })}>P{n}</button>)}</div></div>
          <div className="field"><label>{tr('qt.due')}</label>
            <input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <div className="sheet-actions">
            <button className="btn primary" disabled={busy} onClick={create}>{tr('action.create')}</button>
            <button className="btn ghost" onClick={onClose}>{tr('action.cancel')}</button>
          </div>
        </>
      )}
    </Modal>
  )
}
