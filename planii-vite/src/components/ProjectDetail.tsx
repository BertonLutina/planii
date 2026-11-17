import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { api, apiUpload, mediaUrl } from '@/lib/api'
import { toast, toastErr, Avatar, health, Modal } from '@/lib/ui'
import { TYPE_LABEL, ROLE_LABEL, INVITE_ROLES, canManage, formatDue, isOverdue, parseISO, todayMid, initials } from '@/lib/dates'
import { memberPoints, projectPoints, levelOf, taskPoints } from '@/lib/points'
import { prio, prioMeta, PRIORITIES } from '@/lib/priority'
import { taskTypesOf, roleLibraryOf, typeTone } from '@/lib/tasktype'
import type { Member, Poll, Appointment, Project, ProjectLabel, ProjectRole, Task, TaskComment, TaskEvent, TaskStatus, User, PaginatedResponse, Activity } from '@/lib/types'
import { LoadMoreButton } from '@/lib/usePagination'
import { Meeting } from './Meeting'
import { Mic, MicInput, MicTextarea } from './Mic'
import { Ic } from './Icon'
import { t as tt, trTerm } from '@/lib/i18n'
import { VoiceTaskWizard } from './VoiceTaskWizard'
import { TaskImportWizard } from './TaskImportWizard'
import { PvDropdown } from './PvDropdown'
import { PvDialog } from './PvDialog'
import { NewTaskModal } from './NewTaskModal'
import { TaskTable } from './TaskTable'
import { PvAvatar } from './PvBits'
import { TaskFiles } from './TaskFiles'
import { useRealtime } from '@/lib/realtime'
import { taskComparator, type TaskSort, type Dir } from '@/lib/sort'
import { TaskGrid, type GridGroup } from './TaskGrid'

/** Vue de l'onglet Tâches. `table` = liste par statut (défaut), `grid` = grille d'origine, `columns` = colonnes par statut. */
type TaskView = 'table' | 'columns' | 'grid'
const TVIEW_KEY = 'planii.taskView'

/** Vrai sous 900px — la grille demande trop de largeur, on retombe sur les colonnes. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const on = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

export function ProjectDetail({ id, me, onBack }: { id: string; me: User; onBack: () => void }) {
  const [p, setP] = useState<Project | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tasksPage, setTasksPage] = useState(1)
  const [tasksHasMore, setTasksHasMore] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tab, setTab] = useState<'taches' | 'rendezvous' | 'equipe' | 'membres' | 'sondages' | 'activite'>('taches')
  const [meet, setMeet] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [more, setMore] = useState(false)

  const loadTasks = useCallback(async (page: number, replace: boolean) => {
    setTasksLoading(true)
    try {
      const r = await api<PaginatedResponse<Task>>('GET', `/projects/${id}/tasks?page=${page}&limit=100`)
      setP((prev) => {
        if (!prev) return prev
        const merged = replace ? r.items : [...prev.tasks, ...r.items.filter((t) => !prev.tasks.some((x) => x.id === t.id))]
        return { ...prev, tasks: merged }
      })
      setTasksPage(r.page)
      setTasksHasMore(r.hasMore)
    } catch (e: any) { setErr(e.message) }
    finally { setTasksLoading(false) }
  }, [id])

  const load = useCallback(async () => {
    try {
      const { project } = await api<{ project: Project }>('GET', '/projects/' + id)
      setP({ ...project, tasks: [] })
      setErr(null)
      await loadTasks(1, true)
    } catch (e: any) { setErr(e.message) }
  }, [id, loadTasks])

  const loadMoreTasks = () => { if (!tasksLoading && tasksHasMore) loadTasks(tasksPage + 1, false) }

  useEffect(() => { load() }, [load])
  useRealtime((m) => { if (m.type === 'project' && m.projectId === id) load() })

  if (err) return <div className="app project-detail-app"><div className="wrap"><button className="btn-link" onClick={onBack}>{tt('pd.back')}</button><div className="empty">{err}</div></div></div>
  if (!p) return <div className="app project-detail-app"><div className="wrap"><div className="empty">{tt('common.loading')}</div></div></div>
  if (meet) return <Meeting p={p} me={me} onClose={() => setMeet(false)} />

  const h = health(p.taskCount ?? p.tasks.length, p.doneCount ?? p.tasks.filter((t) => t.done).length, p.status)
  const manage = canManage(p.my_role)
  const isOwner = me.id === p.owner_id
  const closed = p.status === 'done'
  const memberName = (uid: string | null) => { const m = p.members.find((x) => x.id === uid); return m ? m.name : '—' }

  async function closeProject() {
    try { await api('POST', '/projects/' + id + '/close'); setConfirmClose(false); toast(tt('pd.closedOk')); load() } catch (e: any) { toastErr(e.message) }
  }
  async function reopenProject() {
    try { await api('POST', '/projects/' + id + '/reopen'); toast(tt('pd.reopenOk')); load() } catch (e: any) { toastErr(e.message) }
  }
  async function deleteProject() {
    try {
      const r = await api<{ notified: number }>('DELETE', '/projects/' + id)
      toast(r.notified > 0 ? tt('pd.delNotif', { n: r.notified }) : tt('pd.delOk'))
      onBack()
    } catch (e: any) { toastErr(e.message) }
  }

  const taskTotal = h.total
  const deadlineDate = parseISO(p.deadline || null)
  const deadlineLate = !!deadlineDate && deadlineDate < todayMid() && !closed
  const ringOffset = 138.2 * (1 - (h.total ? h.done / h.total : 0))
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const tabs = [
    ['taches', tt('ad.tasks'), taskTotal || ''],
    ['rendezvous', tt('qa.appt'), (p.appointments || []).length || ''],
    ['equipe', tt('pd.tabTeam'), ''],
    ['membres', tt('proj.thMembers'), p.members.length || ''],
    ['sondages', tt('pd.tabPolls'), ''],
    ['activite', tt('pd.tabActivity'), ''],
  ] as const

  return (
    <div className="app project-detail-app pv">
      <div className="pv-frame">
        <div className="pv-appbar">
          <div className="brand"><span className="logo"><b /></span><span>Planii</span></div>
          <span className="pv-sp" />
          <span className="pv-chip">{ROLE_LABEL[p.my_role] || p.my_role}</span>
          <PvAvatar name={me.name} src={mediaUrl(me.avatarUrl)} />
        </div>

        <div className="pv-head">
          <button type="button" className="pv-back" onClick={onBack}><Ic name="chevron-left" s={18} />{tt('pd.back').replace(/^‹\s*/, '')}</button>
          <div className="pv-ptitle">
            <span className="pv-av lg">
              {p.imageUrl ? <img src={mediaUrl(p.imageUrl) || ''} alt="" /> : initials(p.name)}
            </span>
            <div style={{ minWidth: 0 }}>
              <h1>{p.name}</h1>
              <div className="pv-meta">
                <span className="pv-chip">{TYPE_LABEL[p.type]}</span>
                <span>{projectPoints(p)} pts</span>
                {p.deadline && (
                  <span className={'pv-chip' + (deadlineLate ? ' dg' : '')}>
                    {deadlineLate && <Ic name="alert" s={14} />}{cap(tt('pd.delivery'))} {formatDue(p.deadline)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="pv-kpi">
            <div className="pv-ring">
              <svg viewBox="0 0 56 56" aria-hidden="true"><circle className="t" cx="28" cy="28" r="22" /><circle className="v" cx="28" cy="28" r="22" style={{ strokeDashoffset: ringOffset }} /></svg>
              <b className="pv-tnum">{closed ? '✓' : `${h.done}/${h.total}`}</b>
            </div>
            <div className="pv-kpi-txt">
              <strong>{closed ? tt('term.doneSt') : (h.done === 1 ? tt('pv.doneOne') : tt('pv.doneN', { n: h.done }))}</strong>
              {!closed && <small>{(h.total - h.done === 1 ? tt('pv.leftOne') : tt('pv.leftN', { n: Math.max(0, h.total - h.done) }))}</small>}
            </div>
            <div className="pv-bar" aria-hidden="true"><span className="track"><i style={{ width: (h.total ? Math.round((h.done / h.total) * 100) : 0) + '%' }} /></span><b className="pv-tnum">{h.done}/{h.total}</b></div>
          </div>
          <div className="pv-pact">
            {!closed && <button type="button" className="pv-btn acc" onClick={() => setMeet(true)}><Ic name="video" s={18} />{tt('meet.title')}</button>}
            {manage && !closed && <button type="button" className="pv-btn" onClick={() => setConfirmClose(true)}><Ic name="check" s={18} />{tt('pd.close')}</button>}
            {isOwner && closed && p.canReopen && <button type="button" className="pv-btn acc" onClick={reopenProject}>{tt('pd.reopen')}</button>}
            {isOwner && (
              <PvDropdown btnClass="pv-btn ghost sq" align="right" label={tt('pv.projectActions')} button={<Ic name="more" s={18} />}>
                {(close) => (
                  <>
                    {!closed && <button type="button" role="menuitem" className="pv-dd-item" onClick={() => { close(); setEditing(true) }}><Ic name="edit" s={17} />{tt('action.edit')}</button>}
                    <button type="button" role="menuitem" className="pv-dd-item dg" onClick={() => { close(); setConfirmDel(true) }}><Ic name="trash" s={17} />{tt('action.delete')}</button>
                  </>
                )}
              </PvDropdown>
            )}
          </div>
        </div>

        {closed && (
          <div className="pv-banner closed-project-banner">
            <b>{tt('pd.closedT')}</b> {tt('pd.closedX')}
            {isOwner && p.canReopen && p.reopenUntil ? ' ' + tt('pd.reopenUntil', { d: new Date(p.reopenUntil).toLocaleDateString() }) : ''}
            {isOwner && !p.canReopen ? ' ' + tt('pd.reopenLate') : ''}
          </div>
        )}

        {editing && <EditProject p={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
        {confirmClose && (
          <Modal title={tt('pd.closeQ')} onClose={() => setConfirmClose(false)}>
            <p className="sub" style={{ marginTop: 0 }}>
              {tt('pd.closeX', { n: p.name })}
            </p>
            <div className="sheet-actions">
              <button className="btn primary" onClick={closeProject}>{tt('pd.yesClose')}</button>
              <button className="btn ghost" onClick={() => setConfirmClose(false)}>{tt('action.cancel')}</button>
            </div>
          </Modal>
        )}
        {confirmDel && (
          <Modal title={tt('pd.delQ')} onClose={() => setConfirmDel(false)}>
            <p className="sub" style={{ marginTop: 0 }}>
              {tt('pd.delX', { n: p.name })}{p.members.length > 1 ? ' ' + tt('pd.delMembers', { c: p.members.length - 1 }) : ''} {tt('pd.irrev')}
            </p>
            <div className="sheet-actions">
              <button className="btn danger" onClick={deleteProject}>{tt('pd.yesDel')}</button>
              <button className="btn ghost" onClick={() => setConfirmDel(false)}>{tt('action.cancel')}</button>
            </div>
          </Modal>
        )}

        <nav className="pv-tabs" aria-label={tt('pv.projectNav')}>
          {tabs.map(([k, l, n]) => (
            <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>{l}{n !== '' && <em>{n}</em>}</button>
          ))}
        </nav>

        {tab === 'taches' && <TasksTab p={p} me={me} memberName={memberName} reload={load} loadMore={loadMoreTasks} hasMore={tasksHasMore} loadingMore={tasksLoading} />}
        {tab !== 'taches' && (
          <div className="pv-legacy">
            {tab === 'rendezvous' && <AppointmentsTab p={p} me={me} reload={load} />}
            {tab === 'equipe' && <TeamBoard p={p} me={me} reload={load} />}
            {tab === 'membres' && <MembersTab p={p} me={me} manage={manage} reload={load} />}
            {tab === 'sondages' && <PollsTab p={p} reload={load} />}
            {tab === 'activite' && <ActivityTab projectId={id} />}
          </div>
        )}
      </div>

      {/* Mobile : les six onglets passent dans une barre fixe en bas */}
      <nav className="pv-mtab" aria-label={tt('pv.projectNav')}>
        {([['taches', 'list', tt('ad.tasks')], ['rendezvous', 'calendar', tt('pv.tabAppt')], ['equipe', 'users', tt('pd.tabTeam')], ['activite', 'activity', tt('pd.tabActivity')]] as const).map(([k, ic, l]) => (
          <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}><Ic name={ic} s={24} />{l}</button>
        ))}
        <button type="button" className={tab === 'membres' || tab === 'sondages' ? 'on' : ''} onClick={() => setMore(true)}><Ic name="menu" s={24} />{tt('pv.more')}</button>
      </nav>
      {more && (
        <Modal title={tt('pv.more')} onClose={() => setMore(false)}>
          <button type="button" className="mact" onClick={() => { setTab('membres'); setMore(false) }}><span className="mi"><Ic name="users" s={17} /></span>{tt('proj.thMembers')}</button>
          <button type="button" className="mact" onClick={() => { setTab('sondages'); setMore(false) }}><span className="mi"><Ic name="poll" s={17} /></span>{tt('pd.tabPolls')}</button>
        </Modal>
      )}
    </div>
  )
}

function TasksTab({ p, me, memberName, reload, loadMore, hasMore, loadingMore }: {
  p: Project; me: User; memberName: (id: string | null) => string; reload: () => void
  loadMore?: () => void; hasMore?: boolean; loadingMore?: boolean
}) {
  const myTypes = taskTypesOf(me)
  const [newOpen, setNewOpen] = useState<null | { status?: string; assignee?: string }>(null)
  const [voice, setVoice] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [prioId, setPrioId] = useState<string | null>(null)
  const [transferId, setTransferId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addSubFor, setAddSubFor] = useState<string | null>(null)
  const [subTitle, setSubTitle] = useState('')
  const [sortMode, setSortMode] = useState<TaskSort>('priority')
  const [sortDir, setSortDir] = useState<Dir>('asc')
  const [dragId, setDragId] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [doneOpen, setDoneOpen] = useState<Record<string, boolean>>({})
  const [shownEmpty, setShownEmpty] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [onlyLate, setOnlyLate] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusId, setStatusId] = useState<string | null>(null)
  const narrow = useNarrow()
  const [taskView, setTaskView] = useState<TaskView>(() => {
    try {
      const v = localStorage.getItem(TVIEW_KEY)
      return v === 'grid' || v === 'columns' || v === 'table' ? v : 'table'
    } catch { return 'table' }
  })
  const setTaskViewP = (v: TaskView) => {
    setTaskView(v)
    try { localStorage.setItem(TVIEW_KEY, v) } catch { /* stockage indisponible */ }
  }
  // sous 900px : liste de cartes (vue Tableau), sans effacer la préférence
  const effView: TaskView = narrow ? 'table' : taskView
  const member = (id: string | null) => p.members.find((x) => x.id === id)
  const statuses = (p.statuses && p.statuses.length ? p.statuses : [
    { id: 'todo', key: 'todo', label: tt('term.todo'), color: '#9a988f', position: 0, fixed: true },
    { id: 'in_progress', key: 'in_progress', label: tt('term.doing'), color: '#3b82d6', position: 1, fixed: true },
    { id: 'review', key: 'review', label: 'Revu', color: '#9b5de5', position: 2, fixed: true },
    { id: 'transferred', key: 'transferred', label: 'Transféré', color: '#f59f30', position: 3, fixed: false },
    { id: 'done', key: 'done', label: 'Terminé', color: '#4caf50', position: 99, fixed: true },
  ] as TaskStatus[]).slice().sort((a, b) => a.position - b.position)
  const statusOf = (t: Task) => t.statusKey || (t.done ? 'done' : 'todo')
  const nameOf = (id?: string | null) => id ? (member(id)?.name || '—') : '—'
  const closed = p.status === 'done'
  const manageAll = canManage(p.my_role)

  async function addSub(parentId: string) {
    if (!subTitle.trim()) return
    try { await api('POST', '/projects/' + p.id + '/tasks', { title: subTitle.trim(), parentId, priority: 6 }); setSubTitle(''); setAddSubFor(null); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function toggle(t: Task) { try { await api('PATCH', '/tasks/' + t.id, { done: !t.done }); if (!t.done) toast(tt('pd.taskDone')); reload() } catch (e: any) { toastErr(e.message) } }
  async function claim(t: Task) { try { await api('POST', '/tasks/' + t.id + '/claim', {}); toast(tt('pd.taskClaimed')); reload() } catch (e: any) { toastErr(e.message) } }
  async function del(t: Task) { try { await api('DELETE', '/tasks/' + t.id); setDeleteId(null); toast(tt('pd.taskDeleted')); reload() } catch (e: any) { toastErr(e.message) } }
  async function setPriority(t: Task, n: number) { try { await api('PATCH', '/tasks/' + t.id, { priority: n }); setPrioId(null); toast(tt('ad.prioSet', { n })); reload() } catch (e: any) { toastErr(e.message) } }
  async function moveTask(t: Task, statusKey: string) {
    if (statusKey === 'transferred' && !t.transferable) { toastErr(tt('pd.notTransferable')); return }
    const other = p.members.find((m) => m.id !== (t.assigneeId || me.id))
    const transferTo = statusKey === 'transferred' ? (t.transferredTo || other?.id || t.assigneeId || null) : null
    try { await api('PATCH', '/tasks/' + t.id, { statusKey, transferredTo: transferTo }); setDragId(null); toast(statusKey === 'transferred' ? tt('pd.taskTransferred') : tt('pd.statusOk')); reload() }
    catch (e: any) { toastErr(e.message); setDragId(null) }
  }
  async function transferTask(t: Task, userId: string) {
    try {
      await api('PATCH', '/tasks/' + t.id, { statusKey: 'transferred', transferredTo: userId })
      setTransferId(null)
      toast(tt('pd.taskTransferred'))
      reload()
    } catch (e: any) { toastErr(e.message) }
  }
  async function addStatus() {
    const label = newStatus.trim()
    if (!label) return
    setStatusBusy(true)
    try { await api('POST', '/projects/' + p.id + '/task-statuses', { label }); setNewStatus(''); reload() }
    catch (e: any) { toastErr(e.message) }
    finally { setStatusBusy(false) }
  }
  async function removeStatus(key: string) {
    try { await api('DELETE', '/projects/' + p.id + '/task-statuses/' + encodeURIComponent(key)); if (statusFilter === key) setStatusFilter('all'); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function relance(t: Task) {
    try {
      await api('POST', '/tasks/' + t.id + '/remind', {})
      toast(tt('pd.remindOk'))
      reload()
    } catch (e: any) { toastErr(e.message) }
  }

  const overdue = p.tasks.filter((t) => isOverdue(t))
  const cmp = taskComparator(sortMode, sortDir)
  const q = search.trim().toLowerCase()
  const subsOf = (id: string) => p.tasks.filter((s) => s.parentId === id).slice().sort(cmp)
  const matches = (t: Task) => {
    if (onlyLate && !isOverdue(t) && !p.tasks.some((s) => s.parentId === t.id && isOverdue(s))) return false
    if (!q) return true
    return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
      || p.tasks.some((s) => s.parentId === t.id && s.title.toLowerCase().includes(q))
  }
  const roots = p.tasks.filter((t) => !t.parentId && matches(t)).slice().sort(cmp)
  const taskById = (id: string | null) => (id ? p.tasks.find((t) => t.id === id) || null : null)

  /** Droits de l'utilisateur sur une tâche (menu ⋯, édition, déplacement…). */
  const perms = (t: Task) => {
    const over = isOverdue(t)
    const mine = t.assigneeId === me.id
    const unassigned = !t.assigneeId
    const am = member(t.assigneeId)
    const canRelance = !closed && over && !mine && !unassigned && !!am && !!am.email && (manageAll || t.createdBy === me.id)
    const canDel = !closed && (t.createdBy === me.id || manageAll)
    const canEditMeta = !closed && (t.createdBy === me.id || manageAll)
    const canLogHours = !closed && (mine || manageAll)
    const canPrio = !closed && (mine || canEditMeta)
    const canMove = !closed && (mine || t.createdBy === me.id || manageAll)
    const canTransfer = canMove && t.transferable === true && p.members.some((m) => m.id !== (t.assigneeId || me.id))
    const hasMenu = canEditMeta || canLogHours || canDel || canPrio || canTransfer || canMove || (unassigned && !closed)
    return { over, mine, unassigned, canRelance, canDel, canEditMeta, canLogHours, canPrio, canMove, canTransfer, hasMenu }
  }

  // --- Personnes / statuts visibles ---
  const personMatch = (t: Task) => filterUser === 'all'
    || (filterUser === 'none' ? !t.assigneeId : (t.assigneeId === filterUser || t.transferredFrom === filterUser || t.transferredTo === filterUser))
  const sectionMembers = () => {
    const base = p.members.map((m) => ({ id: m.id, name: m.name }))
    const hasUnassigned = roots.some((t) => !t.assigneeId)
    const withNone = hasUnassigned ? [...base, { id: 'none', name: tt('pd.toTakeCap') }] : base
    return filterUser === 'all' ? withNone : withNone.filter((m) => m.id === filterUser)
  }
  const tasksForPerson = (personId: string) => roots.filter((t) => {
    const direct = personId === 'none' ? !t.assigneeId : t.assigneeId === personId
    const transferVisible = personId !== 'none' && (t.transferredFrom === personId || t.transferredTo === personId)
    return direct || transferVisible
  })
  const tasksForStatus = (personId: string, statusKey: string) => tasksForPerson(personId).filter((t) => statusOf(t) === statusKey)
  const personTasks = roots.filter(personMatch)

  // --- Vue Tableau : un groupe par statut, statuts vides masqués ---
  const tGroups = statuses
    .filter((s) => statusFilter === 'all' || s.key === statusFilter)
    .map((s) => ({ status: s, tasks: personTasks.filter((t) => statusOf(t) === s.key) }))
    .filter((g) => g.tasks.length > 0 || shownEmpty[g.status.key] || statusFilter === g.status.key)
  const tEmpties = statusFilter === 'all' ? statuses.filter((s) => !tGroups.some((g) => g.status.key === s.key)) : []

  // --- Vue Grille : mêmes sections que la vue Colonnes, mêmes filtres, même tri ---
  const gridGroups = (): GridGroup[] => sectionMembers().map((u) => ({
    id: u.id,
    name: u.name,
    tasks: tasksForPerson(u.id)
      .filter((t) => statusFilter === 'all' || statusOf(t) === statusFilter)
      .slice().sort(cmp),
  })).filter((g) => g.tasks.length > 0 || filterUser === g.id)

  // --- Vue Colonnes ---
  function dropOnStatus(statusKey: string) {
    const dragged = roots.find((t) => t.id === dragId)
    if (dragged) moveTask(dragged, statusKey)
    else setDragId(null)
  }
  const renderCard = (t: Task) => {
    const pr = perms(t)
    const pm = prioMeta(t.priority)
    const am = member(t.assigneeId)
    const subs = subsOf(t.id)
    const files = t.attachmentCount || 0
    const canDragIt = !closed
    return (
      <article key={t.id}
        className={'pv-kc' + (t.done ? ' done' : '') + (pr.over ? ' late' : '') + (dragId === t.id ? ' dragging' : '')}
        draggable={canDragIt}
        onDragStart={canDragIt ? () => setDragId(t.id) : undefined}
        onDragEnd={canDragIt ? () => setDragId(null) : undefined}
        onClick={(e) => { if (!(e.target as HTMLElement).closest('button,a,input,select,textarea,label')) setEditId(t.id) }}>
        <div className="pv-kc-top">
          <span className={'pv-pr p' + pm.n}><Ic name="flag" s={13} />{pm.tag}</span>
          {t.type && <small>{trTerm(t.type)}</small>}
          <span className="pv-sp" />
          {!pr.mine && !closed && !t.done && <Ic name="lock" s={14} className="l" />}
          {pr.hasMenu && <button type="button" className="pv-more" onClick={() => setMenuId(t.id)} aria-label={tt('pd.actions')}><Ic name="more" s={18} /></button>}
        </div>
        <h3><button type="button" aria-haspopup="dialog" onClick={() => setEditId(t.id)} title={tt('pd.mEdit')}>{t.title}</button></h3>
        <div className="pv-kc-foot">
          {am ? <PvAvatar name={am.name} /> : <span className="pv-none"><Ic name="hand" s={16} />{tt('pd.toTakeCap')}</span>}
          {t.due && <span className={'pv-due pv-tnum' + (pr.over ? ' late' : '')}><Ic name={pr.over ? 'alert' : 'calendar'} s={15} />{formatDue(t.due)}</span>}
          <span className="pv-sp" />
          {!!t.commentCount && <span className="pv-msgs"><Ic name="message" s={15} />{t.commentCount}</span>}
          {files > 0 && <span className="pv-fb" title={tt('files.title')}><Ic name="paperclip" s={15} />{files}</span>}
        </div>
        {statusOf(t) === 'transferred' && <div className="pv-kc-xfer">↪ {nameOf(t.transferredFrom)} → {nameOf(t.transferredTo)}</div>}
        {(subs.length > 0 || addSubFor === t.id) && (
          <div className="pv-kc-subs">
            {subs.map((s) => (
              <div key={s.id} className={'pv-kc-sub' + (s.done ? ' done' : '')}>
                <button type="button" className={'pv-box' + (s.done ? ' done' : '')} disabled={s.assigneeId !== me.id || closed} onClick={() => toggle(s)} aria-label={tt('home.check')}>
                  {s.done && <Ic name="check" s={12} c="#fff" strokeWidth={3} />}
                </button>
                <span>{s.title}</span>
              </div>
            ))}
            {addSubFor === t.id && (
              <div className="subtask-add">
                <input autoFocus value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder={tt('pd.newSub')} onKeyDown={(e) => { if (e.key === 'Enter') addSub(t.id) }} />
                <Mic value={subTitle} onChange={setSubTitle} />
                <button type="button" className="pv-btn sm acc" onClick={() => addSub(t.id)}>{tt('action.add')}</button>
                <button type="button" className="pv-btn sm ghost" onClick={() => { setAddSubFor(null); setSubTitle('') }} aria-label={tt('action.cancel')}>✕</button>
              </div>
            )}
          </div>
        )}
      </article>
    )
  }

  const renderBoard = () => {
    const secs = sectionMembers().filter((u) => tasksForPerson(u.id).length > 0 || filterUser === u.id)
    const visible = statusFilter === 'all' ? statuses : statuses.filter((s) => s.key === statusFilter)
    return (
      <div className="pv-sections">
        {secs.map((u) => {
          const mineTasks = tasksForPerson(u.id)
          const isCol = !!collapsed[u.id] && secs.length > 1
          return (
            <section key={u.id}>
              {secs.length > 1 && (
                <button type="button" className={'pv-gtitle pv-gbtn' + (isCol ? ' collapsed' : '')} aria-expanded={!isCol}
                  onClick={() => setCollapsed((c) => ({ ...c, [u.id]: !c[u.id] }))}>
                  <span className="pv-chev"><Ic name="chevron-down" s={18} /></span>
                  {u.id === 'none' ? <span className="pv-av" style={{ ['--c' as string]: 'var(--pv-hint)' }}><Ic name="hand" s={14} c="#fff" /></span> : <PvAvatar name={u.name} />}
                  <b>{u.name}</b>
                  <span className="pv-tnum">{mineTasks.length} {tt('pd.taskCount')}</span>
                </button>
              )}
              {!isCol && (
                <div className="pv-board">
                  {visible.map((s) => {
                    const list = tasksForStatus(u.id, s.key).sort(cmp)
                    const canDrop = !!dragId && list.every((t) => t.id !== dragId)
                    const style = { '--s': s.color } as CSSProperties
                    if (list.length === 0 && statusFilter === 'all') {
                      return (
                        <div key={s.key} style={style} className={'pv-rail' + (canDrop ? ' can-drop' : '')}
                          onDragOver={(e) => e.preventDefault()} onDrop={() => dropOnStatus(s.key)}>
                          <span className="pv-cnt">0</span>
                          <span className="rl">{trTerm(s.label)}</span>
                          <span className="drop">{tt('pd.dropHere')}</span>
                        </div>
                      )
                    }
                    const limited = s.key === 'done' && list.length > 2 && !doneOpen[u.id]
                    const shown = limited ? list.slice(0, 2) : list
                    const preset = { status: s.key, assignee: u.id === 'none' ? '' : u.id }
                    return (
                      <div key={s.key} style={style} className={'pv-kcol' + (canDrop ? ' can-drop' : '')}
                        onDragOver={(e) => e.preventDefault()} onDrop={() => dropOnStatus(s.key)}>
                        <div className="pv-kh">
                          <span className="pv-pill"><i />{trTerm(s.label)}</span>
                          <span className="pv-cnt">{list.length}</span>
                          <span className="pv-sp" />
                          {!closed && <button type="button" className="pv-ib" onClick={() => setNewOpen(preset)} aria-label={tt('pv.addIn', { s: trTerm(s.label) })}><Ic name="plus" s={18} /></button>}
                        </div>
                        {shown.map(renderCard)}
                        {limited && <button type="button" className="pv-kmore" onClick={() => setDoneOpen((d) => ({ ...d, [u.id]: true }))}>{tt('pv.moreDone', { n: list.length - 2 })}</button>}
                        {s.key === 'done' && list.length > 2 && doneOpen[u.id] && <button type="button" className="pv-kmore" onClick={() => setDoneOpen((d) => ({ ...d, [u.id]: false }))}>{tt('pv.lessDone')}</button>}
                        {!closed && <button type="button" className="pv-kadd" onClick={() => setNewOpen(preset)}><Ic name="plus" s={18} />{tt('action.add')}</button>}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    )
  }

  // --- Fenêtres communes à toutes les vues ---
  const mt = taskById(menuId), trT = taskById(transferId), dt = taskById(deleteId)
  const pt = taskById(prioId), stT = taskById(statusId), et = taskById(editId)
  const sortLabel: Record<TaskSort, string> = { priority: tt('td.priority'), due: tt('td.due'), title: tt('projects.sortTitle'), manual: tt('projects.sortManual') }
  const statusCount = (k: string) => personTasks.filter((t) => statusOf(t) === k).length
  const presetFor = (k?: string) => ({ status: k, assignee: filterUser !== 'all' && filterUser !== 'none' ? filterUser : undefined })

  return (
    <div className="pv-body">
      <div className="pv-tools">
        {!closed && (
          <>
            <div className="pv-split">
              <button type="button" className="pv-btn acc" onClick={() => setNewOpen(presetFor())}><Ic name="plus" s={18} />{tt('qt.title')}</button>
              <PvDropdown btnClass="pv-btn acc" label={tt('pv.moreCreate')} button={<Ic name="chevron-down" s={18} />}>
                {(close) => (
                  <>
                    <button type="button" role="menuitem" className="pv-dd-item" onClick={() => { close(); setImportOpen(true) }}><Ic name="upload" s={17} />{tt('imp.title')}</button>
                    <button type="button" role="menuitem" className="pv-dd-item" onClick={() => { close(); setVoice(true) }}><Ic name="mic" s={17} />{tt('pd.dictate')}</button>
                  </>
                )}
              </PvDropdown>
            </div>
            <button type="button" className="pv-btn sq ghost" onClick={() => setVoice(true)} aria-label={tt('pd.dictate')} title={tt('pd.dictate')}><Ic name="mic" s={18} /></button>
          </>
        )}
        <span className="pv-sp" />
        <label className="pv-search"><Ic name="search" s={18} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tt('pv.search')} aria-label={tt('pv.search')} /></label>
        <PvDropdown btnClass="pv-btn ghost" label={tt('pv.filter')} align="right" button={<><Ic name="filter" s={18} />{statusFilter === 'all' ? tt('pv.filter') : trTerm(statuses.find((s) => s.key === statusFilter)?.label || tt('pv.filter'))}</>}>
          {(close) => (
            <>
              <button type="button" role="menuitem" className={'pv-dd-item' + (statusFilter === 'all' ? ' on' : '')} onClick={() => { setStatusFilter('all'); close() }}>{tt('pd.allStatuses')}</button>
              {statuses.map((s) => (
                <div key={s.key} className="pv-dd-row">
                  <button type="button" role="menuitem" className={'pv-dd-item' + (statusFilter === s.key ? ' on' : '')} onClick={() => { setStatusFilter(s.key); close() }}><i style={{ background: s.color }} />{trTerm(s.label)}</button>
                  {manageAll && !closed && !s.fixed && <button type="button" className="pv-ib" onClick={() => removeStatus(s.key)} aria-label={tt('pv.removeStatus', { n: trTerm(s.label) })} title={tt('pv.removeStatus', { n: trTerm(s.label) })}><Ic name="trash" s={16} /></button>}
                </div>
              ))}
              {manageAll && !closed && (
                <>
                  <div className="pv-dd-sep" />
                  <div className="pv-dd-add">
                    <input value={newStatus} onChange={(e) => setNewStatus(e.target.value)} placeholder={tt('pv.newStatus')} aria-label={tt('pv.newStatus')} onKeyDown={(e) => { if (e.key === 'Enter') addStatus() }} />
                    <button type="button" className="pv-btn sm" disabled={statusBusy} onClick={addStatus}>{tt('action.add')}</button>
                  </div>
                </>
              )}
            </>
          )}
        </PvDropdown>
        <PvDropdown btnClass="pv-btn ghost" label={tt('projects.sort')} align="right" button={<><Ic name="sort" s={18} />{sortLabel[sortMode]}</>}>
          {(close) => (
            <>
              {(['priority', 'due', 'title', 'manual'] as TaskSort[]).map((k) => (
                <button key={k} type="button" role="menuitem" className={'pv-dd-item' + (sortMode === k ? ' on' : '')} onClick={() => { setSortMode(k); close() }}>{sortLabel[k]}</button>
              ))}
              <div className="pv-dd-sep" />
              <button type="button" role="menuitem" className="pv-dd-item" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>{sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}</button>
            </>
          )}
        </PvDropdown>
        {!narrow && (
          <div className="pv-seg" role="group" aria-label={tt('pd.viewLabel')}>
            {([['table', 'table', tt('pv.viewTable')], ['grid', 'grid', tt('pd.viewGrid')], ['columns', 'columns', tt('pd.viewColumns')]] as const).map(([k, ic, l]) => (
              <button key={k} type="button" className={effView === k ? 'on' : ''} aria-pressed={effView === k} onClick={() => setTaskViewP(k)} aria-label={l} title={l}><Ic name={ic} s={18} /></button>
            ))}
          </div>
        )}
      </div>

      <div className="pv-who" role="group" aria-label={tt('pv.byPerson')}>
        <button type="button" className={'txt' + (filterUser === 'all' ? ' on' : '')} onClick={() => setFilterUser('all')}>{tt('pd.everyone')}</button>
        {p.members.map((m) => (
          <button key={m.id} type="button" className={filterUser === m.id ? 'on' : ''} onClick={() => setFilterUser(m.id)}><PvAvatar name={m.name} size="sm" />{m.name.split(' ')[0]}</button>
        ))}
        <button type="button" className={'txt' + (filterUser === 'none' ? ' on' : '')} onClick={() => setFilterUser('none')}>{tt('pd.toTakeCap')}</button>
        {overdue.length > 0 && (
          <button type="button" className={'late' + (onlyLate ? ' on' : '')} aria-pressed={onlyLate} onClick={() => setOnlyLate((v) => !v)}>
            <Ic name="alert" s={16} />{tt('pv.lateN', { n: overdue.length })}
          </button>
        )}
      </div>

      <div className="pv-fchips" role="group" aria-label={tt('meet.status')}>
        <button type="button" className={statusFilter === 'all' ? 'on' : ''} onClick={() => setStatusFilter('all')}>{tt('pv.all')} {personTasks.length}</button>
        {statuses.map((s) => (
          <button key={s.key} type="button" style={{ '--s': s.color } as CSSProperties} className={statusFilter === s.key ? 'on' : ''} onClick={() => setStatusFilter(s.key)}><i />{trTerm(s.label)} {statusCount(s.key)}</button>
        ))}
      </div>

      {p.tasks.length === 0 && !loadingMore && (
        <div className="pv-gwrap"><div className="pv-empty"><b>{tt('pv.noTaskT')}</b>{tt('pd.noTasks')}</div></div>
      )}
      {p.tasks.length > 0 && effView === 'table' && (
        <TaskTable
          groups={tGroups} empties={tEmpties} me={me} closed={closed} memberName={memberName} subsOf={subsOf}
          onToggle={toggle} onOpen={(t) => setEditId(t.id)} onStatus={(t) => setStatusId(t.id)} onPrio={(t) => setPrioId(t.id)}
          onMenu={closed ? null : (t) => setMenuId(t.id)} canMenu={(t) => perms(t).hasMenu}
          onAdd={(k) => setNewOpen(presetFor(k))} onShowEmpty={(k) => setShownEmpty((s) => ({ ...s, [k]: true }))}
        />
      )}
      {p.tasks.length > 0 && effView === 'grid' && (
        <TaskGrid
          groups={gridGroups()} statuses={statuses} statusOf={statusOf} me={me} closed={closed}
          memberName={memberName} subsOf={subsOf}
          onToggle={toggle} onStatus={(t) => setStatusId(t.id)} onPrio={(t) => setPrioId(t.id)} onEdit={(t) => setEditId(t.id)}
        />
      )}
      {p.tasks.length > 0 && effView === 'columns' && renderBoard()}

      {hasMore && loadMore && (
        <div className="pv-gwrap" style={{ paddingTop: 0 }}>
          <button type="button" className="pv-btn ghost" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? tt('common.loading') : `Charger plus (${p.tasks.length}/${p.taskCount ?? '?'})`}
          </button>
        </div>
      )}

      {/* Mobile : un seul groupe de boutons flottants */}
      {!closed && (
        <div className="pv-fab">
          <button type="button" className="m" onClick={() => setVoice(true)} aria-label={tt('pd.dictate')}><Ic name="mic" s={20} /></button>
          <button type="button" className="m" onClick={() => setImportOpen(true)} aria-label={tt('imp.title')}><Ic name="upload" s={20} /></button>
          <button type="button" className="p" onClick={() => setNewOpen(presetFor())} aria-label={tt('qt.title')}><Ic name="plus" s={26} /></button>
        </div>
      )}

      {newOpen && (
        <NewTaskModal p={p} me={me} types={myTypes} statuses={statuses} presetStatus={newOpen.status} presetAssignee={newOpen.assignee}
          onClose={() => setNewOpen(null)} onCreated={() => { setNewOpen(null); reload() }} />
      )}
      {voice && <VoiceTaskWizard p={p} me={me} onClose={() => setVoice(false)} onCreated={() => { setVoice(false); reload() }} />}
      {importOpen && (
        <TaskImportWizard projectId={p.id} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); reload() }} />
      )}

      {mt && (() => {
        const pr = perms(mt)
        const isSub = !!mt.parentId
        const subsN = p.tasks.filter((s) => s.parentId === mt.id).length
        return (
          <Modal title={mt.title} onClose={() => setMenuId(null)}>
            {(pr.canEditMeta || pr.canLogHours) && <button className="mact" onClick={() => { setMenuId(null); setEditId(mt.id) }}><span className="mi"><Ic name="edit" s={17} /></span>{tt('pd.mEdit')}</button>}
            {!isSub && !closed && <button className="mact" onClick={() => { setMenuId(null); setSubTitle(''); setAddSubFor(mt.id) }}><span className="mi"><Ic name="plus" s={17} /></span>{tt('pd.mSub')}</button>}
            {pr.canMove && !isSub && statuses.filter((s) => s.key !== statusOf(mt) && (s.key !== 'transferred' || mt.transferable)).map((s) => (
              <button key={s.key} className="mact" onClick={() => { setMenuId(null); moveTask(mt, s.key) }}><span className="mi"><i className="mact-dot" style={{ background: s.color }} /></span>{tt('pd.mMoveTo', { s: trTerm(s.label) })}</button>
            ))}
            {pr.canPrio && <button className="mact" onClick={() => { setMenuId(null); setPrioId(mt.id) }}><span className="mi">🚩</span>{tt('pd.mPrio')}</button>}
            {pr.canTransfer && <button className="mact" onClick={() => { setMenuId(null); setTransferId(mt.id) }}><span className="mi">⇄</span>{tt('pd.mTransfer')}</button>}
            {pr.unassigned && !closed && <button className="mact" onClick={() => { setMenuId(null); claim(mt) }}><span className="mi">👐</span>{tt('pd.mClaim')}</button>}
            {pr.canRelance && <button className="mact" onClick={() => { setMenuId(null); relance(mt) }}><span className="mi"><Ic name="mail" s={17} /></span>{tt('pd.mRemind')}</button>}
            {pr.canDel && <button className="mact danger" onClick={() => { setMenuId(null); setDeleteId(mt.id) }}><span className="mi"><Ic name="trash" s={17} /></span>{tt('action.delete')}{subsN > 0 ? tt('pd.andSubs') : ''}</button>}
          </Modal>
        )
      })()}
      {trT && <TransferTaskModal p={p} t={trT} me={me} onClose={() => setTransferId(null)} onTransfer={(userId) => transferTask(trT, userId)} />}
      {dt && (
        <Modal title="Supprimer la tâche ?" onClose={() => setDeleteId(null)}>
          <p className="sub" style={{ marginTop: 0 }}>
            La tâche <b>« {dt.title} »</b>{p.tasks.some((s) => s.parentId === dt.id) ? tt('pd.andSubs2') : ''} seront supprimées définitivement.
          </p>
          <div className="sheet-actions">
            <button className="btn danger" onClick={() => del(dt)}>{tt('pd.yesDel')}</button>
            <button className="btn ghost" onClick={() => setDeleteId(null)}>{tt('action.cancel')}</button>
          </div>
        </Modal>
      )}
      {pt && (
        <Modal title={tt('td.priority')} onClose={() => setPrioId(null)}>
          {PRIORITIES.map((n) => (
            <button key={n} className="prow" onClick={() => setPriority(pt, n)}>
              <span className={'pflag ' + prioMeta(n).flagCls} style={{ width: 30, textAlign: 'center' }}>{prioMeta(n).tag}</span>
              <span style={{ flex: 1 }}>{tt('td.priority')} {n}{n === 1 ? tt('pd.mostUrgent') : n === 6 ? tt('pd.lowest') : ''}</span>
              {prio(pt.priority) === n ? '✓' : ''}
            </button>
          ))}
        </Modal>
      )}
      {stT && (
        <Modal title={tt('pd.evStatus')} onClose={() => setStatusId(null)}>
          {statuses.map((s) => (
            <button key={s.key} className="prow" onClick={() => { moveTask(stT, s.key); setStatusId(null) }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flex: 'none', display: 'block' }} />
              <span style={{ flex: 1 }}>{trTerm(s.label)}</span>
              {statusOf(stT) === s.key ? '✓' : ''}
            </button>
          ))}
        </Modal>
      )}
      {et && (() => {
        const pr = perms(et)
        return (
          <EditTask
            p={p} t={et} types={myTypes}
            canEditMeta={pr.canEditMeta} canLogHours={pr.canLogHours}
            onClose={() => setEditId(null)}
            onSaved={() => { setEditId(null); reload() }}
          />
        )
      })()}
    </div>
  )
}

function TeamBoard({ p, me, reload }: { p: Project; me: User; reload: () => void }) {
  const closed = p.status === 'done'
  async function toggle(t: Task) { try { await api('PATCH', '/tasks/' + t.id, { done: !t.done }); if (!t.done) toast(tt('pd.plusPoints')); reload() } catch (e: any) { toastErr(e.message) } }
  const ranked = [...p.members].map((m) => ({ m, pts: memberPoints(p, m.id) })).sort((a, b) => b.pts - a.pts)
  const unassigned = p.tasks.filter((t) => !t.assigneeId && !t.done)
  return (
    <div>
      <div className="banner">Chaque tâche cochée fait monter le score (en avance 20 · le jour même 15 · en retard 5). Total équipe : {projectPoints(p)} pts</div>
      <div className="board">
        {ranked.map(({ m, pts }, i) => {
          const l = levelOf(pts)
          const tasks = p.tasks.filter((t) => t.assigneeId === m.id).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
          return (
            <div key={m.id} className={'board-col' + (i === 0 && pts > 0 ? ' lead' : '')}>
              <div className="board-head">
                <div className="board-who"><Avatar name={m.name} /><div><div className="nm">{m.name}{m.id === me.id ? ' ' + tt('vw.me') : ''}</div><div className="sc">{l.medal} Niveau {l.level}</div></div></div>
                <div className="board-pts">{pts}<span>pts</span></div>
              </div>
              <div className="score-bar sm"><i style={{ width: l.pct + '%' }} /></div>
              <div className="board-tasks">
                {tasks.length === 0 && <div className="sub" style={{ padding: '6px 2px' }}>{tt('pd.noTask')}</div>}
                {tasks.map((t) => {
                  const mine = t.assigneeId === me.id
                  return (
                    <div key={t.id} className={'board-task' + (t.done ? ' done' : '')}>
                      <button className={'check' + (t.done ? ' done' : '') + (mine && !closed ? '' : ' locked')} disabled={!mine || closed} onClick={mine && !closed ? () => toggle(t) : undefined} aria-label={tt('home.check')}>{t.done ? <Ic name="check" s={13} c="#fff" strokeWidth={2.6} /> : (mine && !closed ? '' : <Ic name="lock" s={11} />)}</button>
                      <span className="bt-title">{t.title}{t.done ? ` · +${taskPoints(t)}` : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {unassigned.length > 0 && (
          <div className="board-col">
            <div className="board-head"><div className="board-who"><span className="avatar"><Ic name="hand" s={16} c="#fff" /></span><div><div className="nm">À prendre</div><div className="sc">non assignées</div></div></div></div>
            <div className="board-tasks">
              {unassigned.map((t) => <div key={t.id} className="board-task"><span className="bt-title">{t.title}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MembersTab({ p, me, manage, reload }: { p: Project; me: User; manage: boolean; reload: () => void }) {
  const [links, setLinks] = useState<{ role: string; link: string }[]>([])
  const [newRole, setNewRole] = useState('')
  const [assignFor, setAssignFor] = useState<Member | null>(null)
  const roles: ProjectRole[] = p.roles || []
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name || ''
  const library = roleLibraryOf(me)
  const suggestions = library.filter((r) => !roles.some((pr) => pr.name.toLowerCase() === r.toLowerCase()))

  async function invite(role: string) {
    try { const r = await api<{ role: string; link: string }>('POST', '/projects/' + p.id + '/invites', { role }); setLinks((l) => [r, ...l]); toast(tt('pd.inviteMade')) }
    catch (e: any) { toastErr(e.message) }
  }
  function copy(link: string) { (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast(tt('pd.linkCopied'))).catch(() => toast(tt('pd.copyUnavail'))) }
  async function addRole(name?: string) {
    const nm = (name ?? newRole).trim(); if (!nm) return
    try { await api('POST', '/projects/' + p.id + '/roles', { name: nm }); if (!name) setNewRole(''); toast(tt('msg.saved')); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function delRole(id: string) {
    try { await api('DELETE', '/projects/' + p.id + '/roles/' + id); reload() } catch (e: any) { toastErr(e.message) }
  }
  async function saveAssign(memberId: string, roleIds: string[]) {
    try { await api('PUT', '/projects/' + p.id + '/members/' + memberId + '/roles', { roleIds }); setAssignFor(null); toast(tt('pd.rolesOk')); reload() }
    catch (e: any) { toastErr(e.message) }
  }

  return (
    <div>
      {manage && p.status !== 'done' && (
        <>
          <div className="section-h">{tt('pd.projRoles')}</div>
          <div className="card">
            <p className="sub" style={{ marginTop: 0 }}>Crée des rôles (ex. Chef de projet, Développeur) puis assigne-les aux membres.</p>
            <div className="chips">
              {roles.map((r) => (
                <span key={r.id} className={'chip ' + typeTone(r.name)}>{r.name}
                  <button className="chip-x" onClick={() => delRole(r.id)} aria-label={'Supprimer ' + r.name}>×</button>
                </span>
              ))}
              {roles.length === 0 && <span className="sub">{tt('pd.noRoles')}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input style={{ flex: 1 }} value={newRole} maxLength={40} placeholder="Nouveau rôle…" onChange={(e) => setNewRole(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addRole() }} />
              <Mic value={newRole} onChange={setNewRole} />
              <button className="btn sm" onClick={() => addRole()}>{tt('action.add')}</button>
            </div>
            {suggestions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="sub" style={{ margin: '0 0 6px' }}>{tt('pd.fromLib')}</p>
                <div className="chips">
                  {suggestions.map((r) => <button key={r} className="chip as-btn" onClick={() => addRole(r)}>＋ {r}</button>)}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="section-h">Membres ({p.members.length})</div>
      {p.members.map((m: Member) => (
        <div key={m.id} className="rank">
          <Avatar name={m.name} />
          <div className="info">
            <div className="nm">{m.name}</div>
            <div className="sc">{m.email} · {ROLE_LABEL[m.role] || m.role}{m.job ? ' · ' + m.job : ''}</div>
            {(m.roleIds && m.roleIds.length > 0) && (
              <div className="chips" style={{ marginTop: 5 }}>
                {m.roleIds.map((rid) => roleName(rid) && <span key={rid} className={'chip sm ' + typeTone(roleName(rid))}>{roleName(rid)}</span>)}
              </div>
            )}
          </div>
          {manage && roles.length > 0 && <button className="btn ghost sm" onClick={() => setAssignFor(m)}>{tt('pd.roles')}</button>}
        </div>
      ))}

      {assignFor && (
        <AssignRoles member={assignFor} roles={roles} onClose={() => setAssignFor(null)} onSave={(ids) => saveAssign(assignFor.id, ids)} />
      )}

      {manage && p.status !== 'done' && (
        <>
          <div className="section-h">{tt('pd.invite')}</div>
          <div className="banner">{tt('pd.inviteBanner')}</div>
          <div className="sheet-actions" style={{ flexWrap: 'wrap' }}>
            {(INVITE_ROLES[p.type] || []).map(([role, label]) => <button key={role} className="btn sm" onClick={() => invite(role)}>{tt('pd.linkBtn')} {label}</button>)}
          </div>
          {links.map((lk, i) => (
            <div key={i} className="card" style={{ marginTop: 10 }}>
              <p className="sub" style={{ margin: '0 0 6px' }}>{tt('pd.invitation')} <b>{ROLE_LABEL[lk.role] || lk.role}</b> :</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={lk.link} style={{ flex: 1, fontSize: '12.5px' }} onFocus={(e) => e.currentTarget.select()} />
                <button className="btn sm primary" onClick={() => copy(lk.link)}>{tt('pd.copy')}</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function AssignRoles({ member, roles, onClose, onSave }: { member: Member; roles: ProjectRole[]; onClose: () => void; onSave: (ids: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(member.roleIds || [])
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  return (
    <Modal title={tt('pd.rolesOf') + ' ' + member.name} onClose={onClose}>
      <p className="sub" style={{ marginTop: 0 }}>{tt('pd.pickRoles')}</p>
      {roles.map((r) => (
        <button key={r.id} className="prow" onClick={() => toggle(r.id)}>
          <span className={'chip sm ' + typeTone(r.name)}>{r.name}</span>
          <span style={{ flex: 1 }} />
          {sel.includes(r.id) ? '✓' : ''}
        </button>
      ))}
      <div className="sheet-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={() => onSave(sel)}>{tt('action.save')}</button>
        <button className="btn ghost" onClick={onClose}>{tt('action.cancel')}</button>
      </div>
    </Modal>
  )
}

function AppointmentsTab({ p, me, reload }: { p: Project; me: User; reload: () => void }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [deleting, setDeleting] = useState<Appointment | null>(null)
  const closed = p.status === 'done'
  const manage = canManage(p.my_role)

  function formatDate(date: string) {
    const d = new Date(date + 'T12:00:00')
    return Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  function canEdit(a: Appointment) {
    return !closed && (a.createdBy === me.id || manage)
  }

  async function remove() {
    if (!deleting) return
    try {
      await api('DELETE', '/appointments/' + deleting.id)
      toast(tt('pd.apptDel'))
      setDeleting(null)
      reload()
    } catch (e: any) { toastErr(e.message) }
  }

  const items = [...(p.appointments || [])].sort((a, b) => {
    const da = a.date + a.timeStart
    const db = b.date + b.timeStart
    return da.localeCompare(db)
  })

  return (
    <div>
      {!closed && (
        <button className="btn block" style={{ marginBottom: 12 }} onClick={() => setCreating(true)}>
          ＋ Nouveau rendez-vous
        </button>
      )}
      {items.length === 0 && <div className="empty">{tt('pd.noAppt')}</div>}
      {items.map((a) => (
        <div key={a.id} className="card">
          <div className="row">
            <div>
              <p className="title-lg" style={{ fontSize: 15 }}>{a.title}</p>
              <p className="sub" style={{ marginTop: 4 }}>
                📅 {formatDate(a.date)} · {a.timeStart} – {a.timeEnd}
              </p>
            </div>
            {canEdit(a) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn sm ghost" onClick={() => setEditing(a)}><Ic name="edit" s={15} />{tt('action.edit')}</button>
                <button className="btn sm danger" onClick={() => setDeleting(a)}><Ic name="trash" s={15} />{tt('action.delete')}</button>
              </div>
            )}
          </div>
          {a.description && <p className="sub" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{a.description}</p>}
          <p className="sub" style={{ marginTop: 8 }}>
            {tt('pd.parts2')} {a.participants.length ? a.participants.map((x) => x.name).join(', ') : '—'}
          </p>
        </div>
      ))}

      {creating && (
        <AppointmentModal
          p={p}
          me={me}
          title="Nouveau rendez-vous"
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); reload() }}
        />
      )}
      {editing && (
        <AppointmentModal
          p={p}
          me={me}
          title="Modifier le rendez-vous"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
      {deleting && (
        <Modal title="Supprimer le rendez-vous ?" onClose={() => setDeleting(null)}>
          <p className="sub" style={{ marginTop: 0 }}>
            Le rendez-vous <b>« {deleting.title} »</b> sera supprimé définitivement.
          </p>
          <div className="sheet-actions">
            <button className="btn danger" onClick={remove}>{tt('action.delete')}</button>
            <button className="btn ghost" onClick={() => setDeleting(null)}>{tt('action.cancel')}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function AppointmentModal({
  p,
  me,
  title,
  initial,
  onClose,
  onSaved,
}: {
  p: Project
  me: User
  title: string
  initial?: Appointment
  onClose: () => void
  onSaved: () => void
}) {
  const [f, setF] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    date: initial?.date || '',
    timeStart: initial?.timeStart || '09:00',
    timeEnd: initial?.timeEnd || '10:00',
    participants: initial?.participants.map((x) => x.id) || [me.id],
  })
  const [busy, setBusy] = useState(false)

  const toggleParticipant = (id: string) => {
    setF((prev) => {
      const has = prev.participants.includes(id)
      const next = has ? prev.participants.filter((x) => x !== id) : [...prev.participants, id]
      return { ...prev, participants: next }
    })
  }

  async function save() {
    if (!f.title.trim()) { toastErr(tt('pd.titleReq')); return }
    if (!f.date) { toastErr(tt('pd.dateReq')); return }
    if (!f.timeStart || !f.timeEnd) { toastErr(tt('pd.slotReq')); return }
    if (f.timeStart >= f.timeEnd) { toastErr(tt('pd.endAfter')); return }
    if (!f.participants.length) { toastErr(tt('pd.needPart')); return }
    setBusy(true)
    const body = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      date: f.date,
      timeStart: f.timeStart,
      timeEnd: f.timeEnd,
      participantIds: f.participants,
    }
    try {
      if (initial) {
        await api('PATCH', '/appointments/' + initial.id, body)
        toast(tt('pd.apptUpd'))
      } else {
        await api('POST', '/projects/' + p.id + '/appointments', body)
        toast(tt('pd.apptMade'))
      }
      onSaved()
    } catch (e: any) {
      toastErr(e.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="field">
        <label>{tt('qt.label')}</label>
        <MicInput value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="Ex. Point d’équipe hebdomadaire" />
      </div>
      <div className="field">
        <label>{tt('pd.desc')}</label>
        <MicTextarea value={f.description} onChange={(v) => setF({ ...f, description: v })} placeholder="Ordre du jour, lieu, lien visio…" rows={3} />
      </div>
      <div className="field">
        <label>{tt('qa.date')}</label>
        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </div>
      <div className="field">
        <label>{tt('pd.slot')}</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="time" value={f.timeStart} onChange={(e) => setF({ ...f, timeStart: e.target.value })} />
          <span className="sub">à</span>
          <input type="time" value={f.timeEnd} onChange={(e) => setF({ ...f, timeEnd: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>{tt('pd.parts')}</label>
        <p className="sub" style={{ marginTop: 0, marginBottom: 8 }}>{tt('pd.pickParts')}</p>
        {p.members.map((m) => (
          <label key={m.id} className="checkline" style={{ display: 'flex', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={f.participants.includes(m.id)}
              onChange={() => toggleParticipant(m.id)}
            />
            <span>{m.name}{m.id === me.id ? ' ' + tt('vw.me') : ''}</span>
          </label>
        ))}
      </div>
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={save}>
          {initial ? tt('action.save') : tt('pd.createAppt')}
        </button>
        <button className="btn ghost" onClick={onClose}>{tt('action.cancel')}</button>
      </div>
    </Modal>
  )
}

function PollsTab({ p, reload }: { p: Project; reload: () => void }) {
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<string[]>(['', ''])
  async function create() {
    const options = opts.map((o) => o.trim()).filter(Boolean)
    if (!q.trim() || options.length < 2) return
    try { await api('POST', '/projects/' + p.id + '/polls', { question: q.trim(), options }); setQ(''); setOpts(['', '']); setAdding(false); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function vote(pollId: string, optionId: string) { try { await api('POST', '/polls/' + pollId + '/vote', { optionId }); reload() } catch (e: any) { toastErr(e.message) } }
  return (
    <div>
      {p.status !== 'done' && <button className="btn block" style={{ marginBottom: 12 }} onClick={() => setAdding((v) => !v)}>＋ Nouveau sondage</button>}
      {adding && (
        <div className="card">
          <div className="field"><label>{tt('pd.question')}</label><MicInput value={q} onChange={setQ} placeholder="Ex. Quelle date pour le lancement ?" /></div>
          {opts.map((o, i) => <div className="field" key={i}><label>Option {i + 1}</label><MicInput value={o} onChange={(v) => { const c = [...opts]; c[i] = v; setOpts(c) }} /></div>)}
          <button className="btn-link" onClick={() => setOpts([...opts, ''])}>＋ Ajouter une option</button>
          <div className="sheet-actions"><button className="btn primary sm" onClick={create}>{tt('pd.launchPoll')}</button><button className="btn ghost sm" onClick={() => setAdding(false)}>{tt('action.cancel')}</button></div>
        </div>
      )}
      {p.polls.length === 0 && <div className="empty">{tt('pd.noPolls')}</div>}
      {p.polls.map((poll: Poll) => {
        const total = poll.options.reduce((s, o) => s + o.votes, 0)
        return (
          <div key={poll.id} className="card">
            <p className="title-lg" style={{ fontSize: 15 }}>{poll.question}</p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {poll.options.map((o) => {
                const pct = total ? Math.round(o.votes / total * 100) : 0
                const mine = poll.myVote === o.id
                return (
                  <button key={o.id} onClick={() => vote(poll.id, o.id)} className="poll-opt" style={{ borderColor: mine ? 'var(--accent)' : 'var(--line)' }}>
                    <span className="poll-fill" style={{ width: pct + '%' }} />
                    <span className="poll-lbl">{mine ? '● ' : ''}{o.label}</span>
                    <span className="poll-pct">{o.votes} · {pct}%</span>
                  </button>
                )
              })}
            </div>
            <p className="sub" style={{ marginTop: 8 }}>{total} vote(s)</p>
          </div>
        )
      })}
    </div>
  )
}

function EditProject({ p, onClose, onSaved }: { p: Project; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(p.name)
  const [deadline, setDeadline] = useState(p.deadline || '')
  const [labels, setLabels] = useState<ProjectLabel[]>([])
  const [labelId, setLabelId] = useState(p.labelId || '')
  const [busy, setBusy] = useState(false)
  const [imageUrl, setImageUrl] = useState(p.imageUrl || null)
  const [photoBusy, setPhotoBusy] = useState(false)
  useEffect(() => {
    api<{ labels: ProjectLabel[] }>('GET', '/project-labels')
      .then((r) => {
        setLabels(r.labels)
        if (!labelId) {
          const fallback = r.labels.find((l) => l.label.toLowerCase() === 'travail') || r.labels[0]
          if (fallback) setLabelId(fallback.id)
        }
      })
      .catch(() => {})
  }, [])
  async function onPickImage(file: File | null) {
    if (!file || photoBusy) return
    setPhotoBusy(true)
    try {
      const r = await apiUpload<{ imageUrl: string }>('/projects/' + p.id + '/image', file)
      setImageUrl(r.imageUrl)
      toast(tt('pd.photoOk'))
    } catch (e: any) { toastErr(e.message) }
    finally { setPhotoBusy(false) }
  }
  async function onRemoveImage() {
    if (!imageUrl || photoBusy) return
    setPhotoBusy(true)
    try {
      await api('DELETE', '/projects/' + p.id + '/image')
      setImageUrl(null)
      toast(tt('pd.photoRemoved'))
    } catch (e: any) { toastErr(e.message) }
    finally { setPhotoBusy(false) }
  }
  async function save() {
    if (!name.trim()) { toastErr(tt('pd.nameEmpty')); return }
    setBusy(true)
    try { await api('PATCH', '/projects/' + p.id, { name: name.trim(), deadline: deadline || null, labelId: labelId || null }); toast(tt('pd.projUpd')); onSaved() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      <div className="field"><label>{tt('pd.projectPhoto')}</label>
        <div className="who" style={{ gap: 12, alignItems: 'center' }}>
          <Avatar name={name || p.name} size={56} src={mediaUrl(imageUrl)} />
          <div className="sheet-actions" style={{ marginTop: 0 }}>
            <label className="btn sm ghost" style={{ cursor: photoBusy ? 'wait' : 'pointer' }}>
              {photoBusy ? tt('common.loading') : tt('profile.changePhoto')}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={photoBusy}
                onChange={(e) => { onPickImage(e.target.files?.[0] || null); e.target.value = '' }} />
            </label>
            {imageUrl && <button type="button" className="btn sm ghost" disabled={photoBusy} onClick={onRemoveImage}>{tt('profile.removePhoto')}</button>}
          </div>
        </div>
      </div>
      <div className="field"><label>{tt('proj.name')}</label>
        <MicInput value={name} onChange={setName} placeholder="Nom du projet" /></div>
      <div className="field"><label>{tt('pd.deadline')}</label>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
      <div className="field"><label>{tt('proj.labelList')}</label>
        <select value={labelId} onChange={(e) => setLabelId(e.target.value)}>
          {labels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={save}>{tt('action.save')}</button>
        <button className="btn ghost" onClick={onClose}>{tt('action.cancel')}</button>
      </div>
    </Modal>
  )
}

function EditTask({ p, t, types, canEditMeta, canLogHours, onClose, onSaved }: { p: Project; t: Task; types: string[]; canEditMeta: boolean; canLogHours: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: t.title,
    desc: t.description || '',
    type: t.type || '',
    assigneeId: t.assigneeId || '',
    due: t.due || '',
    est: t.estHours != null ? String(t.estHours) : '',
    spent: t.spentHours != null ? String(t.spentHours) : '',
    prio: prio(t.priority),
    statusKey: t.statusKey || (t.done ? 'done' : 'todo'),
    transferredTo: t.transferredTo || '',
    transferable: t.transferable === true,
  })
  const typeOpts = [...new Set([...types, ...(t.type ? [t.type] : [])])]
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  async function save() {
    const body: any = { priority: f.prio }
    if (canEditMeta) {
      if (!f.title.trim()) { toastErr(tt('pd.titleEmpty')); return }
      body.title = f.title.trim(); body.description = f.desc || null; body.type = f.type || null; body.due = f.due || null; body.assigneeId = f.assigneeId || null; body.transferable = f.transferable
    }
    if (canLogHours) {
      body.estHours = f.est === '' ? null : Number(f.est)
      body.spentHours = f.spent === '' ? null : Number(f.spent)
    }
    // N'envoyer le statut que s'il a bougé. Sur une tâche déjà « transférée »,
    // le renvoyer relance la branche transfert du serveur, qui compare la cible
    // à `assignee_id` — or le premier transfert les a rendus égaux : toute
    // sauvegarde échouait en « Choisissez une autre personne », et celles qui
    // passaient rejouaient les e-mails de transfert.
    const currentStatus = t.statusKey || (t.done ? 'done' : 'todo')
    if (f.statusKey !== currentStatus) {
      body.statusKey = f.statusKey
      body.transferredTo = f.statusKey === 'transferred' ? (f.transferredTo || null) : null
    }
    setBusy(true)
    try { await api('PATCH', '/tasks/' + t.id, body); toast(tt('pd.taskUpd')); onSaved() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <PvDialog
      title={tt('pd.mEdit')}
      onClose={onClose}
      footer={<>
        <button type="button" className="pv-btn ghost" onClick={onClose}>{tt('action.cancel')}</button>
        <button type="button" className="pv-btn acc" disabled={busy} onClick={save}>{tt('action.save')}</button>
      </>}
    >
      {canEditMeta && (
        <>
          <div className="pv-fld"><label htmlFor="et-title">{tt('pv.title')}</label>
            <input id="et-title" type="text" autoComplete="off" value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="pv-fld"><label htmlFor="et-desc">{tt('pv.desc')}</label>
            <textarea id="et-desc" rows={3} value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder={tt('pv.descPh')} /></div>
        </>
      )}
      <TaskFiles task={t} projectClosed={p.status === 'done'} />
      <div className="pv-g2">
        {canEditMeta && (
          <div className="pv-fld"><label htmlFor="et-who">{tt('td.assignee')}</label>
            <select id="et-who" value={f.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
              {p.members.map((m) => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
              <option value="">{tt('pd.toTakeCap')}</option>
            </select></div>
        )}
        <div className="pv-fld"><label htmlFor="et-st">{tt('meet.status')}</label>
          <select id="et-st" value={f.statusKey} onChange={(e) => set('statusKey', e.target.value)}>
            {(p.statuses || []).map((s) => <option key={s.key} value={s.key} disabled={s.key === 'transferred' && !f.transferable}>{trTerm(s.label)}</option>)}
          </select></div>
        <div className="pv-fld"><label htmlFor="et-p">{tt('td.priority')}</label>
          <select id="et-p" value={f.prio} onChange={(e) => set('prio', Number(e.target.value))}>
            {PRIORITIES.map((n) => <option key={n} value={n}>P{n}</option>)}
          </select></div>
        {canEditMeta && (
          <div className="pv-fld"><label htmlFor="et-type">{tt('qt.type')}</label>
            <select id="et-type" value={f.type} onChange={(e) => set('type', e.target.value)}>
              <option value="">{tt('vw.none')}</option>
              {typeOpts.map((x) => <option key={x} value={x}>{trTerm(x)}</option>)}
            </select></div>
        )}
        {canEditMeta && (
          <div className="pv-fld"><label htmlFor="et-due">{tt('td.due')}</label>
            <input id="et-due" type="date" value={f.due} onChange={(e) => set('due', e.target.value)} /></div>
        )}
        {canLogHours && (
          <div className="pv-fld"><label htmlFor="et-est">{tt('pd.estH')}</label>
            <input id="et-est" type="number" min="0" step="0.5" inputMode="decimal" value={f.est} onChange={(e) => set('est', e.target.value)} placeholder="3" /></div>
        )}
        {canLogHours && (
          <div className="pv-fld"><label htmlFor="et-spent">{tt('pd.spentH')}</label>
            <div className="pv-spent">
              <input id="et-spent" type="number" min="0" step="0.5" inputMode="decimal" value={f.spent} onChange={(e) => set('spent', e.target.value)} placeholder="3" />
              <button type="button" className="pv-btn" onClick={() => set('spent', '8')} title={tt('pd.fullDay')}>{tt('pd.day8')}</button>
            </div></div>
        )}
      </div>
      {f.statusKey === 'transferred' && (
        <div className="pv-fld"><label htmlFor="et-tr">{tt('pd.transferTo')}</label>
          <select id="et-tr" value={f.transferredTo} onChange={(e) => set('transferredTo', e.target.value)}>
            <option value="">{tt('pd.chooseOne')}</option>
            {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></div>
      )}
      {canEditMeta && (
        <label className="pv-checkline"><input type="checkbox" checked={f.transferable} onChange={(e) => setF((x) => ({ ...x, transferable: e.target.checked, statusKey: e.target.checked ? x.statusKey : (x.statusKey === 'transferred' ? 'todo' : x.statusKey) }))} /> {tt('meet.transferable')}</label>
      )}
      <TaskComments task={t} projectClosed={p.status === 'done'} />
      <TaskTimeline taskId={t.id} />
    </PvDialog>
  )
}

function TransferTaskModal({ p, t, me, onClose, onTransfer }: { p: Project; t: Task; me: User; onClose: () => void; onTransfer: (userId: string) => void }) {
  const current = t.assigneeId || me.id
  const targets = p.members.filter((m) => m.id !== current)
  return (
    <Modal title={tt('pd.mTransfer')} onClose={onClose}>
      <p className="sub" style={{ marginTop: 0 }}>{tt('pd.pickTransfer', { n: t.title })}</p>
      {targets.length === 0 && <div className="empty">{tt('pd.noTarget')}</div>}
      {targets.map((m) => (
        <button key={m.id} className="prow" onClick={() => onTransfer(m.id)}>
          <Avatar name={m.name} size={30} />
          <span style={{ flex: 1 }}>
            <b>{m.name}</b>
            <span className="sub" style={{ display: 'block', fontSize: '12px' }}>{ROLE_LABEL[m.role] || m.role}{m.id === me.id ? ' · moi' : ''}</span>
          </span>
          <span>{tt('pd.transferBtn')}</span>
        </button>
      ))}
      <div className="sheet-actions" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onClose}>{tt('action.cancel')}</button>
      </div>
    </Modal>
  )
}

function TaskComments({ task, projectClosed }: { task: Task; projectClosed: boolean }) {
  const [comments, setComments] = useState<TaskComment[] | null>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    api<{ comments: TaskComment[] }>('GET', '/tasks/' + task.id + '/comments')
      .then((r) => setComments(r.comments))
      .catch((e: any) => toastErr(e.message))
  }, [task.id])
  useEffect(load, [load])

  async function add() {
    const text = body.trim()
    if (!text) return
    setBusy(true)
    try {
      const r = await api<{ comment: TaskComment }>('POST', '/tasks/' + task.id + '/comments', { body: text })
      setComments((list) => [...(list || []), r.comment])
      setBody('')
      toast(tt('pd.cAdd'))
    } catch (e: any) { toastErr(e.message) }
    finally { setBusy(false) }
  }
  async function remove(c: TaskComment) {
    try {
      await api('DELETE', '/task-comments/' + c.id)
      setComments((list) => (list || []).map((x) => x.id === c.id ? { ...x, body: '[commentaire supprimé]', deleted: true, canDelete: false } : x))
      toast(tt('pd.cDelOk'))
    } catch (e: any) { toastErr(e.message) }
  }

  return (
    <div className="task-side-panel">
      <div className="task-side-head"><b>Commentaires</b><span>{comments ? comments.filter((c) => !c.deleted).length : 0}</span></div>
      {!comments && <div className="sub">{tt('common.loading')}</div>}
      {comments && comments.length === 0 && <div className="sub">{tt('pd.noComments')}</div>}
      <div className="task-comments">
        {(comments || []).map((c) => (
          <div key={c.id} className={'task-comment' + (c.deleted ? ' deleted' : '')}>
            <Avatar name={c.userName} size={26} />
            <div>
              <div className="task-comment-meta"><b>{c.userName}</b><span>{new Date(c.at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
              <p>{c.body}</p>
              {c.canDelete && <button className="btn-link" onClick={() => remove(c)}>{tt('action.delete')}</button>}
            </div>
          </div>
        ))}
      </div>
      {!projectClosed && (
        <div className="task-comment-form">
          <MicTextarea value={body} onChange={setBody} placeholder={tt('pd.commentPh')} />
          <button className="btn primary sm" disabled={busy || !body.trim()} onClick={add}>{tt('pd.commentBtn')}</button>
        </div>
      )}
    </div>
  )
}

const EVENT_LABEL: Record<string, string> = {
  task_created: tt('pd.evCreated'),
  task_done: tt('pd.evDone'),
  task_reopened: tt('pd.evReopened'),
  task_status_changed: tt('pd.evStatus'),
  task_transferred: tt('pd.evTransferred'),
  task_hours_updated: tt('pd.evHours'),
  task_priority_changed: tt('pd.evPrio'),
  task_updated: tt('pd.evUpdated'),
  task_claimed: tt('pd.evClaimed'),
  task_reminded: tt('pd.evReminded'),
  task_deleted: tt('pd.evDeleted'),
  comment_added: tt('pd.evCAdd'),
  comment_deleted: tt('pd.evCDel'),
  attachment_added: tt('pd.evFAdd'),
  attachment_deleted: tt('pd.evFDel'),
}

function TaskTimeline({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskEvent[] | null>(null)
  useEffect(() => {
    api<{ events: TaskEvent[] }>('GET', '/tasks/' + taskId + '/events')
      .then((r) => setEvents(r.events))
      .catch((e: any) => toastErr(e.message))
  }, [taskId])
  return (
    <div className="task-side-panel">
      <div className="task-side-head"><b>{tt('pd.history')}</b><span>{events ? events.length : 0}</span></div>
      {!events && <div className="sub">{tt('common.loading')}</div>}
      {events && events.length === 0 && <div className="sub">{tt('pd.noHistory')}</div>}
      <div className="task-timeline">
        {(events || []).map((e) => (
          <div key={e.id} className="task-event">
            <i />
            <div>
              <b>{EVENT_LABEL[e.type] || e.type}</b>
              <p>{e.actorName} · {new Date(e.at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityTab({ projectId }: { projectId: string }) {
  const [activity, setActivity] = useState<Activity[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback((pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    api<PaginatedResponse<Activity> & { activity: Activity[] }>('GET', `/projects/${projectId}/activity?page=${pageNum}&limit=30`)
      .then((r) => {
        const batch = r.activity || r.items
        setActivity((prev) => (append ? [...prev, ...batch] : batch))
        setPage(r.page)
        setTotal(r.total)
        setHasMore(r.hasMore)
      })
      .catch((e: any) => toastErr(e.message))
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }, [projectId])

  useEffect(() => { load(1, false) }, [load])

  if (loading && activity.length === 0) return <div className="empty">{tt('pd.loadingActivity')}</div>
  if (!activity.length) return <div className="empty">{tt('pd.noActivity')}</div>
  return (
    <div style={{ marginTop: 6 }}>
      {activity.map((a) => (
        <div key={a.id} className="act-row">
          <span className="act-dot" />
          <div>
            <span style={{ fontWeight: 600 }}>{a.user || tt('pd.someone')}</span> <span className="sub" style={{ display: 'inline' }}>{a.detail}</span>
            <div className="sub" style={{ fontSize: '11.5px' }}>{new Date(a.at).toLocaleString('fr-FR')}</div>
          </div>
        </div>
      ))}
      <LoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        loaded={activity.length}
        total={total}
        onClick={() => load(page + 1, true)}
      />
    </div>
  )
}
