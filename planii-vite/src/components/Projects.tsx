import { useCallback, useEffect, useState } from 'react'
import { api, apiUpload, mediaUrl } from '@/lib/api'
import { toast, toastErr, Modal, health, Avatar, readableOn } from '@/lib/ui'
import { ROLE_LABEL, formatDue, parseISO, todayMid } from '@/lib/dates'
import { MicInput } from './Mic'
import { projectComparator, type ProjSort, type Dir } from '@/lib/sort'
import type { InviteInfo, ProjectLabel, ProjectSummary, PaginatedResponse } from '@/lib/types'
import { LoadMoreButton } from '@/lib/usePagination'
import { Ic } from './Icon'
import { PvAvatar } from './PvBits'
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
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState('')
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
  if (!projects) return <div className="empty">{tt('common.loading')}</div>
  const activeCount = counts.active
  const doneCount = counts.done
  const sorted = projects.slice().sort(projectComparator(pSort, pDir))
  const q = search.trim().toLowerCase()
  const filtering = !!q || !!labelFilter
  const labelOf = (p: ProjectSummary) => labelKey(p.labelName || '')
  const list = sorted.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!labelFilter || labelOf(p) === labelFilter))
  /* L'ordre manuel se calcule sur la liste complète : jamais pendant une recherche ou un filtre. */
  const canDrag = pSort === 'manual' && tab === 'active' && view === 'cards' && !filtering
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

  function persistOrder(ids: string[]) {
    api('PUT', '/projects/order', { ids: [...ids, ...projects.filter((p) => p.status === 'done').map((p) => p.id)] }).then(() => load(1, false)).catch((e: any) => toastErr(e.message))
  }
  function dropOn(targetId: string) {
    if (!canDrag || !dragId || dragId === targetId) { setDragId(null); return }
    const ids = list.map((p) => p.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); return }
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setDragId(null)
    persistOrder(ids)
  }
  /** Keyboard / single-pointer alternative to dragging (WCAG 2.5.7). */
  function moveBy(id: string, delta: -1 | 1) {
    const ids = list.map((p) => p.id)
    const from = ids.indexOf(id), to = from + delta
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    persistOrder(ids)
  }

  const rows = list.map((p) => {
    const h = health(p.taskCount, p.doneCount, p.status)
    const typeShort = TYPE_SHORT[p.type] || p.type
    const memberCount = Number.isFinite(Number(p.memberCount)) ? Number(p.memberCount) : 1
    const role = p.type !== 'group' ? (ROLE_LABEL[p.my_role] || p.my_role) : ''
    const label = legendLabels.find((l) => l.id === p.labelId || l.label === p.labelName) || legendLabels[0]
    const labelName = p.labelName || label?.label || 'Travail'
    const labelColor = p.labelColor || label?.color || '#f59e0b'
    const dl = parseISO(p.deadline || null)
    const late = !!dl && dl < todayMid() && p.status !== 'done'
    const full = p.status === 'done' || h.pct === 100
    return { p, h, typeShort, memberCount, role, labelName, labelColor, late, full }
  })
  const avatarOf = (p: ProjectSummary, color: string, cls: string) => mediaUrl(p.imageUrl)
    ? <span className={cls + ' pj-av-img'}><img src={mediaUrl(p.imageUrl)!} alt="" /></span>
    : <span className={cls} style={{ ['--c' as string]: color }}>{initialsOf(p.name)}</span>

  return (
    <div className="pj">
      <div className="pj-bar">
        <div className="pj-seg" role="group" aria-label={tr('projects.active')}>
          <button type="button" className={tab === 'active' ? 'on' : ''} aria-pressed={tab === 'active'} onClick={() => setTab('active')}>{tr('projects.active')} <em>{activeCount}</em></button>
          <button type="button" className={tab === 'done' ? 'on' : ''} aria-pressed={tab === 'done'} onClick={() => setTab('done')}>{tr('projects.done')} <em>{doneCount}</em></button>
        </div>
        <label className="pj-search"><Ic name="search" s={18} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('pj.search')} aria-label={tr('pj.search')} /></label>
        <span className="pj-sp" />
        <button className="pj-join" onClick={onJoin}>{tr('projects.join')}</button>
        <div className="pj-sort">
          <span>{tr('projects.sort')}</span>
          <select value={pSort} onChange={(e) => setPSort(e.target.value as ProjSort)} aria-label="Trier les projets par">
            <option value="title">{tr('projects.sortTitle')}</option>
            <option value="manual">{tr('projects.sortManual')}</option>
          </select>
          <button type="button" onClick={() => setPDir((d) => (d === 'asc' ? 'desc' : 'asc'))} title="Sens du tri" aria-label="Sens du tri">{pDir === 'asc' ? '↑ A→Z' : '↓ Z→A'}</button>
        </div>
        <div className="pj-seg icons" role="group" aria-label={tr('view.cards')}>
          <button type="button" className={view === 'cards' ? 'on' : ''} aria-pressed={view === 'cards'} onClick={() => setViewP('cards')} title={tr('view.cards')} aria-label={tr('view.cards')}><Ic name="grid" s={18} /></button>
          <button type="button" className={view === 'table' ? 'on' : ''} aria-pressed={view === 'table'} onClick={() => setViewP('table')} title={tr('view.table')} aria-label={tr('view.table')}><Ic name="list" s={18} /></button>
        </div>
      </div>
      {legendLabels.length > 0 && (
        <div className="pj-chips" role="group" aria-label="Libellés">
          {legendLabels.map((l) => (
            <button type="button" key={l.id} className={'pj-chip' + (labelFilter === labelKey(l.label) ? ' on' : '')} aria-pressed={labelFilter === labelKey(l.label)}
              onClick={() => setLabelFilter((f) => (f === labelKey(l.label) ? '' : labelKey(l.label)))}><i style={{ background: l.color }} />{trTerm(l.label)}</button>
          ))}
        </div>
      )}
      {canDrag && <div className="pj-hint">{tr('proj.dragHint')}</div>}

      {view === 'table' && rows.length > 0 && (
        <div className="pj-tbl">
          <table className="ptable">
            <thead>
              <tr>
                <th>{tr('proj.thProject')}</th><th>{tr('proj.thLabel')}</th><th>{tr('proj.thProgress')}</th><th className="ta-c">{tr('proj.thTasks')}</th>
                <th className="ta-c">{tr('proj.thMembers')}</th><th>{tr('proj.thRole')}</th><th>{tr('pd.delivery').replace(/^./, (c) => c.toUpperCase())}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, h, memberCount, role, labelName, labelColor, late, full }) => (
                <tr key={p.id} onClick={() => onOpen(p.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(p.id) }}>
                  <td><div className="pj-tn">{avatarOf(p, labelColor, 'pj-av sm')}<span>{p.name}</span></div></td>
                  <td><span className="pj-pill" style={{ ['--c' as string]: labelColor }}><i />{trTerm(labelName)}</span></td>
                  <td><div className="pj-tp"><div className={'pj-track' + (full ? ' full' : '')}><i style={{ width: h.pct + '%' }} /></div><b>{h.pct}%</b></div></td>
                  <td className="ta-c">{h.done}/{h.total}</td>
                  <td className="ta-c">{memberCount}</td>
                  <td className="pt-muted">{role || '—'}</td>
                  <td>{late ? <span className="pj-late"><Ic name="alert" s={13} />{formatDue(p.deadline)}</span> : p.deadline && p.status !== 'done' ? <span className="pj-due">{formatDue(p.deadline)}</span> : <span className="pt-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tab === 'active' && <button className="pj-newrow" onClick={() => setNewOpen(true)}><Ic name="plus" s={15} /> {tr('projects.newProject')}</button>}
        </div>
      )}

      {view === 'cards' && (
        <div className="pj-grid">
          {rows.map(({ p, h, typeShort, memberCount, role, labelName, labelColor, late, full }, idx) => (
            <div key={p.id} className="pj-slot">
              <button className={'pj-card' + (canDrag ? ' draggable' : '') + (dragId === p.id ? ' dragging' : '')} style={{ ['--c' as string]: labelColor }} onClick={() => onOpen(p.id)}
                draggable={canDrag}
                onDragStart={canDrag ? () => setDragId(p.id) : undefined}
                onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
                onDrop={canDrag ? (e) => { e.preventDefault(); dropOn(p.id) } : undefined}>
                <div className="pj-hd">
                  {avatarOf(p, labelColor, 'pj-av')}
                  <div className="pj-ti">
                    <b>{p.name}</b>
                    <span><Ic name={TYPE_ICON[p.type] || 'folder'} s={13} />{typeShort}{role ? ' · ' + role : ''}</span>
                  </div>
                </div>
                <div className="pj-mid">
                  <span className="pj-pill"><i />{trTerm(labelName)}</span>
                  {late && <span className="pj-late"><Ic name="alert" s={13} />{formatDue(p.deadline)}</span>}
                  {!late && p.deadline && p.status !== 'done' && <span className="pj-due"><Ic name="calendar" s={14} />{formatDue(p.deadline)}</span>}
                  {p.status === 'done' && <span className="pj-due ok"><Ic name="circle-check" s={14} />{tr('projects.done')}</span>}
                </div>
                <div className="pj-prog">
                  <div className="pj-nums"><span>{h.done}/{h.total} {tr('projects.tasks')}</span><b>{h.pct}%</b></div>
                  <div className={'pj-track' + (full ? ' full' : '')}><i style={{ width: h.pct + '%' }} /></div>
                </div>
                <div className="pj-ft">
                  {(p.memberPreview?.length ?? 0) > 0
                    ? (
                      <span className="pj-stack">
                        {p.memberPreview!.slice(0, 3).map((m) => <PvAvatar key={m.id} name={m.name} src={mediaUrl(m.avatarUrl)} />)}
                        {memberCount > 3 && <span className="pj-more" role="img" aria-label={tr('pj.others', { n: memberCount - 3 })} title={tr('pj.others', { n: memberCount - 3 })}>+{memberCount - 3}</span>}
                      </span>
                    )
                    : <Ic name="users" s={15} />}
                  <small>{memberCount === 1 ? tr('pj.member1') : tr('pj.members', { n: memberCount })}</small>
                </div>
                {canDrag && <span className="drag-handle pj-drag" aria-hidden="true"><Ic name="grip" s={14} /></span>}
              </button>
              {canDrag && (
                <div className="pj-move" role="group" aria-label={tr('proj.moveGroup', { n: p.name })}>
                  <button type="button" disabled={idx === 0} onClick={() => moveBy(p.id, -1)} aria-label={tr('proj.moveEarlier', { n: p.name })} title={tr('proj.moveEarlier', { n: p.name })}><Ic name="chevron-up" s={14} /></button>
                  <button type="button" disabled={idx === rows.length - 1} onClick={() => moveBy(p.id, 1)} aria-label={tr('proj.moveLater', { n: p.name })} title={tr('proj.moveLater', { n: p.name })}><Ic name="chevron-down" s={14} /></button>
                </div>
              )}
            </div>
          ))}
          {tab === 'active' && <button className="pj-card pj-new" onClick={() => setNewOpen(true)}><Ic name="plus" s={18} /> {tr('projects.newProject')}</button>}
        </div>
      )}
      {rows.length === 0 && filtering && <div className="pj-none"><b>{tr('pj.none')}</b>{tr('pj.noneHint')}</div>}
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  useEffect(() => { if (!f.labelId && defaultLabel) setF((x) => ({ ...x, labelId: defaultLabel.id })) }, [defaultLabel, f.labelId])
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])
  async function create() {
    if (!f.name.trim()) return
    setBusy(true)
    try {
      const r = await api<{ project: { id: string } }>('POST', '/projects', { name: f.name.trim(), type: f.type, deadline: f.deadline || null, labelId: f.labelId || null })
      if (imageFile) {
        try { await apiUpload('/projects/' + r.project.id + '/image', imageFile) }
        catch (e: any) { toastErr(e.message) }
      }
      toast(tr('proj.created')); onCreated(r.project.id)
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title={tr('projects.newProject')} onClose={onClose}>
      <div className="field"><label>{tr('pd.projectPhoto')}</label>
        <div className="who" style={{ gap: 12, alignItems: 'center' }}>
          <Avatar name={f.name || 'P'} size={56} src={imagePreview} />
          <label className="btn sm ghost" style={{ cursor: 'pointer' }}>
            {tr('profile.changePhoto')}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setImageFile(file)
                if (imagePreview) URL.revokeObjectURL(imagePreview)
                setImagePreview(file ? URL.createObjectURL(file) : null)
                e.target.value = ''
              }} />
          </label>
          {imageFile && (
            <button type="button" className="btn sm ghost" onClick={() => {
              setImageFile(null)
              if (imagePreview) URL.revokeObjectURL(imagePreview)
              setImagePreview(null)
            }}>{tr('profile.removePhoto')}</button>
          )}
        </div>
      </div>
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
