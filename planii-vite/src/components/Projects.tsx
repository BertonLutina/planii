import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr, Modal, health } from '@/lib/ui'
import { ROLE_LABEL } from '@/lib/dates'
import { MicInput } from './Mic'
import { projectComparator, type ProjSort, type Dir } from '@/lib/sort'
import type { InviteInfo, ProjectLabel, ProjectSummary, PaginatedResponse } from '@/lib/types'
import { LoadMoreButton } from '@/lib/usePagination'
import { Ic } from './Icon'
import { useI18n, t as tt, trTerm } from '@/lib/i18n'

const TYPE_SHORT: Record<string, string> = new Proxy({}, { get: (_o, k) => tt('proj.type' + String(k)[0].toUpperCase() + String(k).slice(1)) }) as Record<string, string>
const TYPE_ICON: Record<string, string> = { solo: 'user', team: 'users', group: 'users' }
/** Initiales : 2 premières lettres significatives du nom. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '•'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
type ProjView = 'cards' | 'table'

const DEFAULT_PROJECT_LABELS: ProjectLabel[] = [
  { id: 'default-work', label: 'Travail', color: '#f59e0b', position: 0, fixed: true },
  { id: 'default-private', label: 'Privé', color: '#ef4444', position: 1, fixed: true },
]
const labelKey = (label: string) => label.trim().toLowerCase()

export function ProjectsList({ onOpen, onJoin, openSignal, onOpenSignalConsumed }: { onOpen: (id: string) => void; onJoin: () => void; openSignal?: number; onOpenSignalConsumed?: () => void }) {
  const { t: tr } = useI18n()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [labels, setLabels] = useState<ProjectLabel[]>(DEFAULT_PROJECT_LABELS)
  const [err, setErr] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const [pSort, setPSort] = useState<ProjSort>('title')
  const [pDir, setPDir] = useState<Dir>('asc')
  const [view, setView] = useState<ProjView>(() => {
    try { return (localStorage.getItem('planii.projView') as ProjView) || 'cards' } catch { return 'cards' }
  })
  const setViewP = (v: ProjView) => { setView(v); try { localStorage.setItem('planii.projView', v) } catch { /* ignore */ } }
  const [dragId, setDragId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ active: 0, done: 0 })
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback((pageNum = 1, append = false) => {
    const paginate = pSort !== 'manual'
    const path = paginate
      ? `/projects?page=${pageNum}&limit=24&status=${tab}`
      : `/projects?status=${tab}`
    const req = paginate
      ? api<PaginatedResponse<ProjectSummary> & { counts: { active: number; done: number } }>('GET', path)
      : api<{ projects: ProjectSummary[] }>('GET', path)
    if (append) setLoadingMore(true)
    req
      .then(async (r) => {
        if ('items' in r) {
          setProjects((prev) => (append && prev ? [...prev, ...r.items] : r.items))
          setPage(r.page)
          setTotal(r.total)
          setHasMore(r.hasMore)
          setCounts(r.counts)
        } else {
          setProjects(r.projects)
          setPage(1)
          setTotal(r.projects.length)
          setHasMore(false)
          setCounts({
            active: r.projects.filter((p) => p.status !== 'done').length,
            done: r.projects.filter((p) => p.status === 'done').length,
          })
        }
        try {
          const lr = await api<{ labels: ProjectLabel[] }>('GET', '/project-labels')
          setLabels(lr.labels.length ? lr.labels : DEFAULT_PROJECT_LABELS)
        } catch {
          setLabels(DEFAULT_PROJECT_LABELS)
        }
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoadingMore(false))
  }, [tab, pSort])

  useEffect(() => { load(1, false) }, [load])
  useEffect(() => {
    if (!openSignal) return
    setNewOpen(true)
    onOpenSignalConsumed?.()
  }, [openSignal, onOpenSignalConsumed])

  if (err) return <div className="empty">Impossible de charger : {err}</div>
  if (!projects) return <div className="empty">Chargement…</div>
  const activeCount = counts.active
  const doneCount = counts.done
  const list = projects.slice().sort(projectComparator(pSort, pDir))
  const canDrag = pSort === 'manual' && tab === 'active' && view === 'cards'
  const legendLabels = (() => {
    const byKey = new Map<string, ProjectLabel>()
    labels.forEach((l) => {
      const key = labelKey(l.label)
      if (!byKey.has(key)) byKey.set(key, l)
    })
    projects.forEach((p) => {
      if (!p.labelName || !p.labelColor) return
      const key = labelKey(p.labelName)
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: p.labelId || p.labelName,
          label: p.labelName,
          color: p.labelColor,
          position: 99,
          fixed: false,
        })
      }
    })
    return [...byKey.values()].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
  })()

  function dropOn(targetId: string) {
    if (!canDrag || !dragId || dragId === targetId) { setDragId(null); return }
    const ids = list.map((p) => p.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); return }
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setDragId(null)
    api('PUT', '/projects/order', { ids: [...ids, ...projects.filter((p) => p.status === 'done').map((p) => p.id)] }).then(() => load(1, false)).catch((e: any) => toastErr(e.message))
  }

  return (
    <div>
      <div className="proj-head">
        <div className="tabs" style={{ margin: 0, maxWidth: 280 }}>
          <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>{tr('projects.active')} ({activeCount})</button>
          <button className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>{tr('projects.done')} ({doneCount})</button>
        </div>
        <button className="btn-link" onClick={onJoin}>{tr('projects.join')}</button>
      </div>
      <div className="project-controls">
        <div className="list-tools">
          <div className="viewseg proj-viewseg">
            <button className={view === 'cards' ? 'on' : ''} onClick={() => setViewP('cards')} title={tr('view.cards')}><Ic name="board" s={15} /> {tr('view.cards')}</button>
            <button className={view === 'table' ? 'on' : ''} onClick={() => setViewP('table')} title={tr('view.table')}><Ic name="list" s={15} /> {tr('view.table')}</button>
          </div>
          <label className="lt-lbl">{tr('projects.sort')}</label>
          <select value={pSort} onChange={(e) => setPSort(e.target.value as ProjSort)} aria-label="Trier les projets par">
            <option value="title">{tr('projects.sortTitle')}</option>
            <option value="manual">{tr('projects.sortManual')}</option>
          </select>
          <button className="btn sm" onClick={() => setPDir((d) => (d === 'asc' ? 'desc' : 'asc'))} title="Sens du tri">{pDir === 'asc' ? '↑ A→Z' : '↓ Z→A'}</button>
        </div>
        <div className="project-legend" aria-label="Légende des libellés">
          {legendLabels.map((l) => (
            <span key={l.id} className="project-legend-item"><i style={{ background: l.color }} />{trTerm(l.label)}</span>
          ))}
        </div>
      </div>
      {canDrag && <div className="sub" style={{ margin: '0 2px 8px' }}>{tr('proj.dragHint')}</div>}
      {(() => {
        const rows = list.map((p) => {
          const h = health(p.taskCount, p.doneCount, p.status)
          const typeShort = TYPE_SHORT[p.type] || p.type
          const memberCount = Number.isFinite(Number(p.memberCount)) ? Number(p.memberCount) : 1
          const role = p.type !== 'group' ? (ROLE_LABEL[p.my_role] || p.my_role) : ''
          const label = legendLabels.find((l) => l.id === p.labelId || l.label === p.labelName) || legendLabels[0]
          const labelName = p.labelName || label?.label || 'Travail'
          const labelColor = p.labelColor || label?.color || '#f59e0b'
          const barColor = p.status === 'done' ? 'var(--ok)' : 'var(--accent)'
          return { p, h, typeShort, memberCount, role, labelName, labelColor, barColor }
        })

        if (view === 'table') {
          return (
            <div className="ptable-wrap">
              <table className="ptable">
                <thead>
                  <tr>
                    <th>{tr('proj.thProject')}</th><th>{tr('proj.thType')}</th><th>{tr('proj.thRole')}</th><th className="ta-c">{tr('proj.thMembers')}</th>
                    <th className="ta-c">{tr('proj.thTasks')}</th><th>{tr('proj.thProgress')}</th><th>{tr('proj.thLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ p, h, typeShort, memberCount, role, labelName, labelColor, barColor }) => (
                    <tr key={p.id} onClick={() => onOpen(p.id)} tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(p.id) }}>
                      <td className="pt-name">
                        <span className="pt-avatar" style={{ background: labelColor }}>{initialsOf(p.name)}</span>
                        <span className="pt-name-txt">{p.name}</span>
                      </td>
                      <td><span className="pt-type"><Ic name={TYPE_ICON[p.type] || 'folder'} s={13} /> {typeShort}</span></td>
                      <td className="pt-muted">{role || '—'}</td>
                      <td className="ta-c">{memberCount}</td>
                      <td className="ta-c">{h.done}/{h.total}</td>
                      <td>
                        <div className="pt-prog">
                          <div className="pt-bar"><i style={{ width: h.pct + '%', background: barColor }} /></div>
                          <span className="pt-pct">{h.pct}%</span>
                        </div>
                      </td>
                      <td><span className="pt-chip" style={{ color: labelColor, background: 'color-mix(in srgb,' + labelColor + ' 14%, transparent)', borderColor: 'color-mix(in srgb,' + labelColor + ' 40%, transparent)' }}><i style={{ background: labelColor }} />{trTerm(labelName)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tab === 'active' && <button className="pt-newrow" onClick={() => setNewOpen(true)}><Ic name="plus" s={15} /> {tr('projects.newProject')}</button>}
            </div>
          )
        }

        return (
          <div className="pcard-grid">
            {rows.map(({ p, h, typeShort, memberCount, role, labelName, labelColor, barColor }) => (
              <button key={p.id} className={'pcard' + (canDrag ? ' draggable' : '') + (dragId === p.id ? ' dragging' : '')} onClick={() => onOpen(p.id)}
                draggable={canDrag}
                onDragStart={canDrag ? () => setDragId(p.id) : undefined}
                onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
                onDrop={canDrag ? (e) => { e.preventDefault(); dropOn(p.id) } : undefined}>
                <span className="pcard-accent" style={{ background: labelColor }} />
                <div className="pcard-head">
                  <span className="pcard-avatar" style={{ background: labelColor }}>{initialsOf(p.name)}</span>
                  <div className="pcard-titles">
                    <b className="pcard-name">{p.name}</b>
                    <span className="pcard-type"><Ic name={TYPE_ICON[p.type] || 'folder'} s={12} /> {typeShort}{role ? ' · ' + role : ''}</span>
                  </div>
                  <span className="pcard-chip" style={{ color: labelColor, background: 'color-mix(in srgb,' + labelColor + ' 14%, transparent)', borderColor: 'color-mix(in srgb,' + labelColor + ' 40%, transparent)' }}>{trTerm(labelName)}</span>
                </div>
                <div className="pcard-stats">
                  <span className="pcard-stat"><Ic name="users" s={14} /> {memberCount}</span>
                  <span className="pcard-stat"><Ic name="tasks" s={14} /> {h.done}/{h.total} {tr('projects.tasks')}</span>
                  {p.status === 'done' && <span className="pcard-stat pcard-done"><Ic name="circle-check" s={14} c="var(--ok)" /> {tr('projects.done')}</span>}
                </div>
                <div className="pcard-prog">
                  <div className="pcard-bar"><i style={{ width: h.pct + '%', background: barColor }} /></div>
                  <span className="pcard-pct" style={{ color: barColor }}>{h.pct}%</span>
                </div>
                {canDrag && <span className="drag-handle pcard-drag" aria-hidden="true"><Ic name="grip" s={14} /></span>}
              </button>
            ))}
            {tab === 'active' && <button className="pcard pcard-new" onClick={() => setNewOpen(true)}><Ic name="plus" s={18} /> {tr('projects.newProject')}</button>}
          </div>
        )
      })()}
      <LoadMoreButton
        hasMore={hasMore && pSort !== 'manual'}
        loading={loadingMore}
        loaded={projects.length}
        total={total}
        onClick={() => load(page + 1, true)}
      />
      {list.length === 0 && tab === 'done' && <div className="empty"><div className="big">◎</div>{tr('proj.noneDone')}</div>}
      {newOpen && <NewProject labels={labels} onClose={() => setNewOpen(false)} onCreated={(pid) => { setNewOpen(false); onOpen(pid) }} />}
    </div>
  )
}

function NewProject({ labels, onClose, onCreated }: { labels: ProjectLabel[]; onClose: () => void; onCreated: (id: string) => void }) {
  const { t: tr } = useI18n()
  const defaultLabel = labels.find((l) => l.label.toLowerCase() === 'travail') || labels[0]
  const [f, setF] = useState({ name: '', type: 'solo', deadline: '', labelId: defaultLabel?.id || '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!f.labelId && defaultLabel) setF((x) => ({ ...x, labelId: defaultLabel.id })) }, [defaultLabel, f.labelId])
  async function create() {
    if (!f.name.trim()) return
    setBusy(true)
    try {
      const r = await api<{ project: { id: string } }>('POST', '/projects', { name: f.name.trim(), type: f.type, deadline: f.deadline || null, labelId: f.labelId || null })
      toast(tr('proj.created')); onCreated(r.project.id)
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title={tr('projects.newProject')} onClose={onClose}>
      <div className="field"><label>{tr('proj.name')}</label>
        <MicInput value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Ex. Site web — Café du Coin" /></div>
      <div className="field"><label>{tr('proj.type')}</label>
        <div className="seg" style={{ flexDirection: 'column', gap: 8 }}>
          {([['solo', tr('proj.optSolo')], ['team', tr('proj.optTeam')], ['group', tr('proj.optGroup')]] as [string, string][]).map(([k, l]) => (
            <button key={k} className={f.type === k ? 'on' : ''} style={{ textAlign: 'left' }} onClick={() => setF({ ...f, type: k })}>{l}</button>
          ))}
        </div></div>
      <div className="field"><label>{tr('proj.labelList')}</label>
        <select value={f.labelId} onChange={(e) => setF({ ...f, labelId: e.target.value })}>
          {labels.map((l) => <option key={l.id} value={l.id}>{trTerm(l.label)}</option>)}
        </select>
      </div>
      <div className="field"><label>{tr('proj.deadline')}</label>
        <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={create}>{tr('action.create')}</button>
        <button className="btn ghost" onClick={onClose}>{tr('action.cancel')}</button>
      </div>
    </Modal>
  )
}

export function JoinModal({ token, onClose, onJoined }: { token: string; onClose: () => void; onJoined: (id: string) => void }) {
  const { t: tr } = useI18n()
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
    try { const r = await api<{ project: { id: string } }>('POST', '/invites/' + encodeURIComponent(info!.token!) + '/accept', {}); toast(tr('proj.joined')); onJoined(r.project.id) }
    catch (e: any) { toastErr(e.message) }
  }
  return (
    <Modal title={tr('proj.joinTitle')} onClose={onClose}>
      <div className="field"><label>{tr('proj.inviteLink')}</label>
        <input value={tok} onChange={(e) => setTok(e.target.value)} placeholder="https://planii.app/invite/…" /></div>
      {!info && <button className="btn primary block" onClick={preview}>{tr('proj.check')}</button>}
      {err && <p style={{ color: 'var(--danger)', fontSize: '13.5px' }}>{err}</p>}
      {info && (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="title-lg" style={{ fontSize: 15 }}>{info.project.name}</p>
          <p className="sub">{tr('proj.joinAs')} <b>{ROLE_LABEL[info.role] || info.role}</b>{info.invitedBy ? ` · ${tr('proj.invitedBy')} ${info.invitedBy}` : ''}</p>
          <button className="btn primary block" style={{ marginTop: 10 }} onClick={accept}>{tr('proj.joinBtn')}</button>
        </div>
      )}
    </Modal>
  )
}
