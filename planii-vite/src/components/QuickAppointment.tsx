import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Avatar, Modal, toast, toastErr } from '@/lib/ui'
import { MicInput } from './Mic'
import type { Member, Project, ProjectSummary, User } from '@/lib/types'
import { useI18n } from '@/lib/i18n'

/** Création rapide d'un rendez-vous depuis l'agenda (choix du projet + date + horaires).
 *
 *  `createAppointment` exige un intitulé **et** au moins un participant : sans
 *  les deux, l'API répond 400 et aucune création ne pouvait aboutir. On charge
 *  donc les membres du projet choisi, l'utilisateur pré-coché. */
export function QuickAppointment({ me, onClose, onCreated }: { me: User; onClose: () => void; onCreated: () => void }) {
  const { t: tr } = useI18n()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [f, setF] = useState({ projectId: '', title: '', date: '', timeStart: '', timeEnd: '', participants: [] as string[] })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ projects: ProjectSummary[] }>('GET', '/projects')
      .then((r) => { const a = r.projects.filter((p) => p.status !== 'done'); setProjects(a); if (a[0]) setF((v) => ({ ...v, projectId: a[0].id })) })
      .catch((e) => toastErr(e.message))
  }, [])

  // Les résumés ne portent pas les membres : il faut le projet complet.
  useEffect(() => {
    if (!f.projectId) { setMembers(null); return }
    let alive = true
    setMembers(null)
    api<Project>('GET', '/projects/' + f.projectId)
      .then((p) => {
        if (!alive) return
        setMembers(p.members)
        setF((v) => ({ ...v, participants: p.members.some((m) => m.id === me.id) ? [me.id] : [] }))
      })
      .catch(() => { if (alive) setMembers([]) })
    return () => { alive = false }
  }, [f.projectId, me.id])

  const toggle = (id: string) => setF((v) => ({
    ...v,
    participants: v.participants.includes(id) ? v.participants.filter((x) => x !== id) : [...v.participants, id],
  }))

  async function create() {
    if (!f.projectId) { toastErr(tr('qt.pickProject')); return }
    if (!f.title.trim()) { toastErr(tr('pd.titleReq')); return }
    if (!f.date || !f.timeStart || !f.timeEnd) { toastErr(tr('qa.needFields')); return }
    if (f.timeEnd <= f.timeStart) { toastErr(tr('pd.endAfter')); return }
    if (!f.participants.length) { toastErr(tr('pd.needPart')); return }
    setBusy(true)
    try {
      await api('POST', '/projects/' + f.projectId + '/appointments', {
        title: f.title.trim(), date: f.date, timeStart: f.timeStart, timeEnd: f.timeEnd,
        participantIds: f.participants,
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
          <div className="field"><label>{tr('qt.label')}</label>
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
          <div className="field"><label>{tr('pd.parts')}</label>
            <p className="sub" style={{ marginTop: 0 }}>{tr('pd.pickParts')}</p>
            {members === null ? <span className="sub">{tr('common.loading')}</span> : members.map((m) => (
              <label key={m.id} className="checkline" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input type="checkbox" checked={f.participants.includes(m.id)} onChange={() => toggle(m.id)} />
                <Avatar name={m.name} size={28} />
                <span>{m.name}{m.id === me.id ? ' ' + tr('vw.me') : ''}{m.job ? ' · ' + m.job : ''}</span>
              </label>
            ))}
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
