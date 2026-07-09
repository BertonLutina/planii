import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr, Modal, health } from '@/lib/ui'
import { ROLE_LABEL } from '@/lib/dates'
import { MicInput } from './Mic'
import { projectComparator, type ProjSort, type Dir } from '@/lib/sort'
import type { InviteInfo, ProjectSummary } from '@/lib/types'

export function ProjectsList({ onOpen, onJoin, openSignal }: { onOpen: (id: string) => void; onJoin: () => void; openSignal?: number }) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const [pSort, setPSort] = useState<ProjSort>('title')
  const [pDir, setPDir] = useState<Dir>('asc')
  const [dragId, setDragId] = useState<string | null>(null)
  const load = useCallback(() => { api<{ projects: ProjectSummary[] }>('GET', '/projects').then((r) => setProjects(r.projects)).catch((e) => setErr(e.message)) }, [])
  useEffect(load, [load])
  useEffect(() => { if (openSignal) setNewOpen(true) }, [openSignal])

  if (err) return <div className="empty">Impossible de charger : {err}</div>
  if (!projects) return <div className="empty">Chargement…</div>
  const active = projects.filter((p) => p.status !== 'done')
  const done = projects.filter((p) => p.status === 'done')
  const list = (tab === 'active' ? active : done).slice().sort(projectComparator(pSort, pDir))
  const canDrag = pSort === 'manual' && tab === 'active'

  function dropOn(targetId: string) {
    if (!canDrag || !dragId || dragId === targetId) { setDragId(null); return }
    const ids = list.map((p) => p.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); return }
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setDragId(null)
    api('PUT', '/projects/order', { ids: [...ids, ...done.map((p) => p.id)] }).then(load).catch((e: any) => toastErr(e.message))
  }

  return (
    <div>
      <div className="proj-head">
        <div className="tabs" style={{ margin: 0, maxWidth: 280 }}>
          <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>Actifs ({active.length})</button>
          <button className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>Terminés ({done.length})</button>
        </div>
        <button className="btn-link" onClick={onJoin}>Rejoindre un projet…</button>
      </div>
      <div className="list-tools">
        <label className="lt-lbl">Trier</label>
        <select value={pSort} onChange={(e) => setPSort(e.target.value as ProjSort)} aria-label="Trier les projets par">
          <option value="title">Titre</option>
          <option value="manual">Manuel</option>
        </select>
        <button className="btn sm" onClick={() => setPDir((d) => (d === 'asc' ? 'desc' : 'asc'))} title="Sens du tri">{pDir === 'asc' ? '↑ A→Z' : '↓ Z→A'}</button>
      </div>
      {canDrag && <div className="sub" style={{ margin: '0 2px 8px' }}>Glissez les projets pour changer l’ordre.</div>}
      <div className="proj-grid">
        {list.map((p) => {
          const h = health(p.taskCount, p.doneCount, p.status)
          const typeShort = ({ solo: '1-à-1', team: 'Équipe', group: 'Groupe' } as Record<string, string>)[p.type] || p.type
          const sub = typeShort + (p.type !== 'group' ? ' · ' + (ROLE_LABEL[p.my_role] || p.my_role) : '') + ` · ${h.done}/${h.total} tâches`
          return (
            <button key={p.id} className={'proj-card' + (canDrag ? ' draggable' : '') + (dragId === p.id ? ' dragging' : '')} onClick={() => onOpen(p.id)}
              draggable={canDrag}
              onDragStart={canDrag ? () => setDragId(p.id) : undefined}
              onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
              onDrop={canDrag ? (e) => { e.preventDefault(); dropOn(p.id) } : undefined}>
              {canDrag && <span className="drag-handle" aria-hidden="true">⠿</span>}
              <div className="pc-name">{p.name}</div>
              <div className="pc-sub">{sub}</div>
              <div className="mini-bar"><i style={{ width: h.pct + '%', background: p.status === 'done' ? 'var(--ok)' : 'var(--accent)' }} /></div>
            </button>
          )
        })}
        {tab === 'active' && <button className="proj-card new" onClick={() => setNewOpen(true)}>＋ Nouveau projet</button>}
      </div>
      {list.length === 0 && tab === 'done' && <div className="empty"><div className="big">◎</div>Aucun projet terminé.</div>}
      {newOpen && <NewProject onClose={() => setNewOpen(false)} onCreated={(pid) => { setNewOpen(false); onOpen(pid) }} />}
    </div>
  )
}

function NewProject({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({ name: '', type: 'solo', deadline: '' })
  const [busy, setBusy] = useState(false)
  async function create() {
    if (!f.name.trim()) return
    setBusy(true)
    try {
      const r = await api<{ project: { id: string } }>('POST', '/projects', { name: f.name.trim(), type: f.type, deadline: f.deadline || null })
      toast('Projet créé ✓'); onCreated(r.project.id)
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="Nouveau projet" onClose={onClose}>
      <div className="field"><label>Nom du projet</label>
        <MicInput value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Ex. Site web — Café du Coin" /></div>
      <div className="field"><label>Type de projet</label>
        <div className="seg" style={{ flexDirection: 'column', gap: 8 }}>
          {([['solo', '1-à-1 — un client'], ['team', 'Équipe — client + plusieurs prestataires (vous = leader)'], ['group', 'Groupe — communauté, famille, amis']] as [string, string][]).map(([k, l]) => (
            <button key={k} className={f.type === k ? 'on' : ''} style={{ textAlign: 'left' }} onClick={() => setF({ ...f, type: k })}>{l}</button>
          ))}
        </div></div>
      <div className="field"><label>Date de livraison (optionnel)</label>
        <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={create}>Créer</button>
        <button className="btn ghost" onClick={onClose}>Annuler</button>
      </div>
    </Modal>
  )
}

export function JoinModal({ token, onClose, onJoined }: { token: string; onClose: () => void; onJoined: (id: string) => void }) {
  const [tok, setTok] = useState(token || '')
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const extract = (s: string) => { const m = String(s).match(/\/invite\/([^/?#\s]+)/); return m ? m[1] : String(s).trim() }
  async function preview() {
    setErr(null); setInfo(null)
    const t = extract(tok); if (!t) return
    try { const r = await api<InviteInfo>('GET', '/invites/' + encodeURIComponent(t)); setInfo({ ...r, token: t }) }
    catch (e: any) { setErr(e.message) }
  }
  useEffect(() => { if (token) preview() }, [])
  async function accept() {
    try { const r = await api<{ project: { id: string } }>('POST', '/invites/' + encodeURIComponent(info!.token!) + '/accept', {}); toast('Projet rejoint ✓'); onJoined(r.project.id) }
    catch (e: any) { toastErr(e.message) }
  }
  return (
    <Modal title="Rejoindre un projet" onClose={onClose}>
      <div className="field"><label>Lien ou code d’invitation</label>
        <input value={tok} onChange={(e) => setTok(e.target.value)} placeholder="https://planii.app/invite/…" /></div>
      {!info && <button className="btn primary block" onClick={preview}>Vérifier</button>}
      {err && <p style={{ color: 'var(--danger)', fontSize: '13.5px' }}>{err}</p>}
      {info && (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="title-lg" style={{ fontSize: 15 }}>{info.project.name}</p>
          <p className="sub">Vous rejoindrez en tant que <b>{ROLE_LABEL[info.role] || info.role}</b>{info.invitedBy ? ` · invité par ${info.invitedBy}` : ''}</p>
          <button className="btn primary block" style={{ marginTop: 10 }} onClick={accept}>Rejoindre le projet</button>
        </div>
      )}
    </Modal>
  )
}
