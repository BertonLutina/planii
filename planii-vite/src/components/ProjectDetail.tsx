import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr, Avatar, health, Modal } from '@/lib/ui'
import { TYPE_LABEL, ROLE_LABEL, INVITE_ROLES, canManage, formatDue, isOverdue } from '@/lib/dates'
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
import { useRealtime } from '@/lib/realtime'
import { taskComparator, type TaskSort, type Dir } from '@/lib/sort'

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

  return (
    <div className="app project-detail-app">
      <div className="topbar">
        <div className="brand"><span className="logo"><b /></span><span>Planii</span></div>
        <div className="who"><span className="role-tag">{ROLE_LABEL[p.my_role] || p.my_role}</span><Avatar name={me.name} /></div>
      </div>
      <div className="wrap">
        <button className="btn-link" onClick={onBack}>{tt('pd.back')}</button>
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row">
            <div>
              <p className="title-lg">{p.name}</p>
              <p className="sub" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><span className="role-tag">{TYPE_LABEL[p.type]}</span> · <Ic name="star" s={12} c="var(--gold)" /> {projectPoints(p)} pts{p.deadline ? ` · ${tt('pd.delivery')} ${formatDue(p.deadline)}` : ''}</p>
            </div>
            <span className={'pill ' + (p.status === 'done' ? 'ok' : 'acc')}>{p.status === 'done' ? tt('term.doneSt') : `${h.done}/${h.total}`}</span>
          </div>
          <div className="mini-bar"><i style={{ width: h.pct + '%', background: p.status === 'done' ? 'var(--ok)' : 'var(--accent)' }} /></div>
          <div className="sheet-actions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            {!closed && <button className="btn sm primary" onClick={() => setMeet(true)}><Ic name="video" s={15} />{tt('meet.title')}</button>}
            {manage && !closed && <button className="btn sm ghost" onClick={() => setConfirmClose(true)}><Ic name="check" s={15} />{tt('pd.close')}</button>}
            {isOwner && closed && p.canReopen && <button className="btn sm primary" onClick={reopenProject}>{tt('pd.reopen')}</button>}
            {isOwner && !closed && <button className="btn sm ghost" onClick={() => setEditing(true)}><Ic name="edit" s={15} />{tt('action.edit')}</button>}
            {isOwner && <button className="btn sm danger" onClick={() => setConfirmDel(true)}><Ic name="trash" s={15} />{tt('action.delete')}</button>}
          </div>
        </div>

        {closed && (
          <div className="banner closed-project-banner">
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

        <div className="tabs" style={{ marginTop: 6 }}>
          {([['taches', tt('ad.tasks')], ['rendezvous', tt('qa.appt')], ['equipe', tt('pd.tabTeam')], ['membres', tt('proj.thMembers')], ['sondages', tt('pd.tabPolls')], ['activite', tt('pd.tabActivity')]] as const).map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'taches' && <TasksTab p={p} me={me} memberName={memberName} reload={load} loadMore={loadMoreTasks} hasMore={tasksHasMore} loadingMore={tasksLoading} />}
        {tab === 'rendezvous' && <AppointmentsTab p={p} me={me} reload={load} />}
        {tab === 'equipe' && <TeamBoard p={p} me={me} reload={load} />}
        {tab === 'membres' && <MembersTab p={p} me={me} manage={manage} reload={load} />}
        {tab === 'sondages' && <PollsTab p={p} reload={load} />}
        {tab === 'activite' && <ActivityTab projectId={id} />}
      </div>
    </div>
  )
}

function TasksTab({ p, me, memberName, reload, loadMore, hasMore, loadingMore }: {
  p: Project; me: User; memberName: (id: string | null) => string; reload: () => void
  loadMore?: () => void; hasMore?: boolean; loadingMore?: boolean
}) {
  const myTypes = taskTypesOf(me)
  const [adding, setAdding] = useState(false)
  const [voice, setVoice] = useState(false)
  const [nf, setNf] = useState<{ title: string; desc: string; type: string; assigneeId: string; due: string; est: string; priority: number; transferable: boolean }>({ title: '', desc: '', type: myTypes[0] || '', assigneeId: '', due: '', est: '', priority: 6, transferable: false })
  const [editId, setEditId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [prioId, setPrioId] = useState<string | null>(null)
  const [transferId, setTransferId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addSubFor, setAddSubFor] = useState<string | null>(null)
  const [subTitle, setSubTitle] = useState('')
  const [sortMode, setSortMode] = useState<TaskSort>('priority')
  const [sortDir, setSortDir] = useState<Dir>('asc')
  const [grouped, setGrouped] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [newStatus, setNewStatus] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
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

  function dropOn(targetId: string) {
    if (sortMode !== 'manual' || !dragId || dragId === targetId) { setDragId(null); return }
    const ids = roots.map((r) => r.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId)
    if (from < 0 || to < 0) { setDragId(null); return }
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setDragId(null)
    api('PUT', '/projects/' + p.id + '/tasks/order', { ids }).then(reload).catch((e: any) => toastErr(e.message))
  }

  async function addTask() {
    if (!nf.title.trim()) return
    try { await api('POST', '/projects/' + p.id + '/tasks', { title: nf.title.trim(), description: nf.desc || null, type: nf.type || null, assigneeId: nf.assigneeId || null, due: nf.due || null, estHours: nf.est || null, priority: nf.priority, transferable: nf.transferable }); setNf({ title: '', desc: '', type: myTypes[0] || '', assigneeId: '', due: '', est: '', priority: 6, transferable: false }); setAdding(false); toast(tt('qt.created')); reload() }
    catch (e: any) { toastErr(e.message) }
  }
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
    try { await api('DELETE', '/projects/' + p.id + '/task-statuses/' + encodeURIComponent(key)); reload() }
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
  const roots = p.tasks.filter((t) => !t.parentId).slice().sort(cmp)
  const canDrag = false

  const renderTask = (t: Task, isSub = false) => {
    const over = isOverdue(t)
    const mine = t.assigneeId === me.id
    const unassigned = !t.assigneeId
    const am = member(t.assigneeId)
    const manage = canManage(p.my_role)
    const canRelance = !closed && over && !mine && !unassigned && am && am.email && (manage || t.createdBy === me.id)
    const canDel = !closed && (t.createdBy === me.id || manage)
    const canEditMeta = !closed && (t.createdBy === me.id || manage)
    const canLogHours = !closed && (mine || manage)
    const hasHours = t.spentHours != null || t.estHours != null
    const pm = prioMeta(t.priority)
    const canPrio = !closed && (mine || canEditMeta)
    const canMove = !closed && (mine || t.createdBy === me.id || manage)
    const canTransfer = canMove && t.transferable === true && p.members.some((m) => m.id !== (t.assigneeId || me.id))
    const subs = isSub ? [] : p.tasks.filter((s) => s.parentId === t.id)
    const subDone = subs.filter((s) => s.done).length
    const hasMenu = canEditMeta || canLogHours || canDel || canPrio || canTransfer || (unassigned && !closed)
    return (
      <div key={t.id} className={'task status-task' + (isSub ? ' subtask' : '') + (t.done ? ' done' : '') + (over ? ' overdue' : '') + (dragId === t.id ? ' dragging' : '')}
        draggable={!isSub && !closed}
        onDragStart={!isSub && !closed ? () => setDragId(t.id) : undefined}
        onDragEnd={!isSub && !closed ? () => setDragId(null) : undefined}>
        <div className="tt">
          <button className={'check' + (t.done ? ' done' : ' ' + pm.ringCls) + (mine && !closed ? '' : ' locked')} disabled={!mine || closed} onClick={mine && !closed ? () => toggle(t) : undefined} title={closed ? tt('pd.closedShort') : mine ? '' : tt('pd.onlyOwner')} aria-label={tt('home.check')}>{t.done ? <Ic name="check" s={13} c="#fff" strokeWidth={2.6} /> : (mine && !closed ? '' : <Ic name="lock" s={11} />)}</button>
          <div className="tname">
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {pm.n < 6 && <span className={'pflag ' + pm.flagCls}>{pm.tag}</span>}
              {t.type && <span className={'ttype ' + typeTone(t.type)}>{trTerm(t.type)}</span>}
              <span style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
            </span>
            {t.description && <div className="sub" style={{ marginTop: 2 }}>{t.description}</div>}
            <div className="meta">
              <span className={'tag ' + (unassigned ? 'due' : 'client')}>{unassigned ? <><Ic name="hand" s={12} /> {tt('vw.toTake')}</> : <><Ic name="user" s={12} /> {memberName(t.assigneeId)}</>}</span>
              {t.due && <span className={'tag ' + (over ? 'late' : 'due')}>📅 {formatDue(t.due)}</span>}
              {hasHours && <span className="tag hours">⏱ {t.spentHours != null ? t.spentHours + 'h' : '0h'}{t.estHours != null ? ` / ~${t.estHours}h` : ''}</span>}
              {t.transferable && <span className="tag acc">⇄ {tt('pd.transferableTag')}</span>}
              {!!t.commentCount && <span className="tag due">💬 {t.commentCount}</span>}
              {subs.length > 0 && <span className="tag due">☑ {subDone}/{subs.length}</span>}
              <span className="tag due">{statuses.find((s) => s.key === statusOf(t))?.label ? trTerm(statuses.find((s) => s.key === statusOf(t))!.label) : tt('term.todo')}</span>
              {statusOf(t) === 'transferred' && <span className="tag acc">↪ {nameOf(t.transferredFrom)} → {nameOf(t.transferredTo)}</span>}
              {t.transferHistory && t.transferHistory.length > 0 && <span className="tag due">{tt('pd.pathN')} {t.transferHistory.length}</span>}
            </div>
            {t.transferHistory && t.transferHistory.length > 0 && (
              <div className="transfer-path">
                {t.transferHistory.map((h) => <span key={h.id}>{h.fromName || tt('pd.depart')} → {h.toName}</span>)}
              </div>
            )}
          </div>
          {hasMenu && <button className="more-btn" onClick={() => setMenuId(t.id)} aria-label={tt('pd.actions')}>⋯</button>}
        </div>
        {canRelance && <div className="relance"><span>{tt('pd.lateRemind', { n: memberName(t.assigneeId) })}</span><button onClick={() => relance(t)}>{tt('pd.remindBtn')}</button></div>}
        {menuId === t.id && (
          <Modal title={t.title} onClose={() => setMenuId(null)}>
            {(canEditMeta || canLogHours) && <button className="mact" onClick={() => { setMenuId(null); setEditId(t.id) }}><span className="mi"><Ic name="edit" s={17} /></span>{tt('pd.mEdit')}</button>}
            {!isSub && !closed && <button className="mact" onClick={() => { setMenuId(null); setSubTitle(''); setAddSubFor(t.id) }}><span className="mi"><Ic name="plus" s={17} /></span>{tt('pd.mSub')}</button>}
            {canPrio && <button className="mact" onClick={() => { setMenuId(null); setPrioId(t.id) }}><span className="mi">🚩</span>{tt('pd.mPrio')}</button>}
            {canTransfer && <button className="mact" onClick={() => { setMenuId(null); setTransferId(t.id) }}><span className="mi">⇄</span>{tt('pd.mTransfer')}</button>}
            {unassigned && !closed && <button className="mact" onClick={() => { setMenuId(null); claim(t) }}><span className="mi">👐</span>{tt('pd.mClaim')}</button>}
            {canRelance && <button className="mact" onClick={() => { setMenuId(null); relance(t) }}><span className="mi"><Ic name="mail" s={17} /></span>{tt('pd.mRemind')}</button>}
            {canDel && <button className="mact danger" onClick={() => { setMenuId(null); setDeleteId(t.id) }}><span className="mi"><Ic name="trash" s={17} /></span>{tt('action.delete')}{subs.length > 0 ? tt('pd.andSubs') : ''}</button>}
          </Modal>
        )}
        {transferId === t.id && <TransferTaskModal p={p} t={t} me={me} onClose={() => setTransferId(null)} onTransfer={(userId) => transferTask(t, userId)} />}
        {deleteId === t.id && (
          <Modal title="Supprimer la tâche ?" onClose={() => setDeleteId(null)}>
            <p className="sub" style={{ marginTop: 0 }}>
              La tâche <b>« {t.title} »</b>{subs.length > 0 ? tt('pd.andSubs2') : ''} seront supprimées définitivement.
            </p>
            <div className="sheet-actions">
              <button className="btn danger" onClick={() => del(t)}>{tt('pd.yesDel')}</button>
              <button className="btn ghost" onClick={() => setDeleteId(null)}>{tt('action.cancel')}</button>
            </div>
          </Modal>
        )}
        {prioId === t.id && (
          <Modal title={tt('td.priority')} onClose={() => setPrioId(null)}>
            {PRIORITIES.map((n) => (
              <button key={n} className="prow" onClick={() => setPriority(t, n)}>
                <span className={'pflag ' + prioMeta(n).flagCls} style={{ width: 30, textAlign: 'center' }}>{prioMeta(n).tag}</span>
                <span style={{ flex: 1 }}>{tt('td.priority')} {n}{n === 1 ? tt('pd.mostUrgent') : n === 6 ? tt('pd.lowest') : ''}</span>
                {prio(t.priority) === n ? '✓' : ''}
              </button>
            ))}
          </Modal>
        )}
        {editId === t.id && <EditTask p={p} t={t} types={myTypes} canEditMeta={canEditMeta} canLogHours={canLogHours} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); reload() }} />}
      </div>
    )
  }

  const renderRoot = (t: Task) => {
    const subs = p.tasks.filter((s) => s.parentId === t.id).slice().sort(cmp)
    return (
      <div key={t.id} className={'task-group' + (canDrag ? ' draggable' : '') + (dragId === t.id ? ' dragging' : '')}
        draggable={canDrag}
        onDragStart={canDrag ? () => setDragId(t.id) : undefined}
        onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
        onDrop={canDrag ? () => dropOn(t.id) : undefined}>
        {canDrag && <span className="drag-handle" aria-hidden="true" title="Glisser pour réordonner">⠿</span>}
        {renderTask(t)}
        {(subs.length > 0 || addSubFor === t.id) && (
          <div className="subtasks">
            {subs.map((s) => renderTask(s, true))}
            {addSubFor === t.id && (
              <div className="subtask-add">
                <input autoFocus value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder={tt('pd.newSub')} onKeyDown={(e) => { if (e.key === 'Enter') addSub(t.id) }} />
                <Mic value={subTitle} onChange={setSubTitle} />
                <button className="btn sm primary" onClick={() => addSub(t.id)}>{tt('action.add')}</button>
                <button className="btn sm ghost" onClick={() => { setAddSubFor(null); setSubTitle('') }}>✕</button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const groupByAssignee = () => {
    const map = new Map<string, Task[]>()
    for (const t of roots) { const k = t.assigneeId || ''; if (!map.has(k)) map.set(k, []); map.get(k)!.push(t) }
    const keys = [...map.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : (member(a)?.name || '').localeCompare(member(b)?.name || '', 'fr', { sensitivity: 'base' })))
    return keys.map((k) => (
      <div key={k || 'none'}>
        <div className="grp-h" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Ic name={k ? 'user' : 'hand'} s={13} />{k ? (member(k)?.name || '—') : 'À prendre'} · {map.get(k)!.length}</div>
        {map.get(k)!.map(renderRoot)}
      </div>
    ))
  }

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
  const renderUserStatusBoard = () => sectionMembers().map((u) => {
    const personTasks = tasksForPerson(u.id)
    if (!personTasks.length && filterUser !== u.id) return null
    const isCollapsed = collapsed[u.id]
    const initials = u.id === 'none' ? '👐' : undefined
    const visibleStatuses = statusFilter === 'all' ? statuses : statuses.filter((s) => s.key === statusFilter)
    return (
      <div key={u.id} className={'user-status-section' + (isCollapsed ? ' collapsed' : '')}>
        <button className="user-status-head" onClick={() => setCollapsed((c) => ({ ...c, [u.id]: !c[u.id] }))}>
          <span className="chev">{isCollapsed ? '›' : '⌄'}</span>
          {initials ? <span className="avatar">{initials}</span> : <Avatar name={u.name} size={34} />}
          <span className="user-status-name">{u.name}</span>
          <span className="user-status-count">{personTasks.length} {tt('pd.taskCount')}</span>
        </button>
        {!isCollapsed && (
          <div className="user-status-board">
            {visibleStatuses.map((s) => {
              const list = tasksForStatus(u.id, s.key).sort(cmp)
              const activeDrop = dragId && list.every((t) => t.id !== dragId)
              return (
                <div key={s.key} className={'status-col' + (activeDrop ? ' can-drop' : '')}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const dragged = roots.find((t) => t.id === dragId)
                    if (dragged) moveTask(dragged, s.key)
                  }}>
                  <div className="status-col-head">
                    <span><i style={{ background: s.color }} />{s.label}</span>
                    <b>{list.length}</b>
                    {canManage(p.my_role) && !closed && !s.fixed && <button className="status-remove" onClick={() => removeStatus(s.key)} title="Supprimer ce statut">×</button>}
                  </div>
                  <div className="status-drop-label">{tt('pd.dropHere')}</div>
                  {list.map((t) => renderRoot(t))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  })

  return (
    <div>
      {overdue.length > 0 && <div className="banner" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>⚠ {overdue.length} tâche(s) en retard.</div>}
      {p.status !== 'done' && (
        <div className="sheet-actions" style={{ marginBottom: 12 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setAdding((v) => !v)}>＋ Nouvelle tâche</button>
          <button className="btn primary" onClick={() => setVoice(true)} title="Créer une tâche à la voix"><Ic name="mic" s={16} />{tt('pd.dictate')}</button>
        </div>
      )}
      {voice && <VoiceTaskWizard p={p} me={me} onClose={() => setVoice(false)} onCreated={() => { setVoice(false); reload() }} />}
      {adding && (
        <div className="card">
          <div className="field"><label>{tt('qt.label')}</label>
            <MicInput value={nf.title} onChange={(v) => setNf({ ...nf, title: v })} placeholder="Ex. Envoyer les visuels" /></div>
          <div className="field"><label>{tt('pd.descOpt')}</label>
            <MicTextarea value={nf.desc} onChange={(v) => setNf({ ...nf, desc: v })} placeholder="Détails, contexte…" /></div>
          <div className="field"><label>{tt('qt.type')}</label>
            <div className="type-pick">
              <button className={nf.type === '' ? 'on' : ''} onClick={() => setNf({ ...nf, type: '' })}>{tt('vw.none')}</button>
              {myTypes.map((t) => <button key={t} className={nf.type === t ? 'on ' + typeTone(t) : ''} onClick={() => setNf({ ...nf, type: t })}>{t}</button>)}
            </div></div>
          <div className="field"><label>{tt('td.assignee')}</label>
            <select value={nf.assigneeId} onChange={(e) => setNf({ ...nf, assigneeId: e.target.value })}>
              <option value="">— À prendre (non assignée)</option>
              {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === me.id ? ' ' + tt('vw.me') : ''}</option>)}
            </select></div>
          <div className="field"><label>Échéance</label><input type="date" value={nf.due} onChange={(e) => setNf({ ...nf, due: e.target.value })} /></div>
          <div className="field"><label>{tt('td.priority')}</label>
            <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={nf.priority === n ? 'on o' + n : ''} onClick={() => setNf({ ...nf, priority: n })}>P{n}</button>)}</div></div>
          <label className="checkline"><input type="checkbox" checked={nf.transferable} onChange={(e) => setNf({ ...nf, transferable: e.target.checked })} /> {tt('meet.transferable')}</label>
          <div className="field"><label>{tt('pd.estOpt')}</label><input type="number" min="0" step="0.5" value={nf.est} onChange={(e) => setNf({ ...nf, est: e.target.value })} placeholder="ex. 5" /></div>
          <div className="sheet-actions"><button className="btn primary sm" onClick={addTask}>{tt('action.add')}</button><button className="btn ghost sm" onClick={() => setAdding(false)}>{tt('action.cancel')}</button></div>
        </div>
      )}
      <div className="status-workspace">
        <aside className="status-filter">
          <div className="status-filter-title">{tt('pd.filter')}</div>
          <button className={filterUser === 'all' ? 'on' : ''} onClick={() => setFilterUser('all')}>👥 {tt('pd.everyone')}</button>
          {p.members.map((m) => <button key={m.id} className={filterUser === m.id ? 'on' : ''} onClick={() => setFilterUser(m.id)}><Avatar name={m.name} size={26} />{m.name.split(' ')[0]}</button>)}
          <button className={filterUser === 'none' ? 'on' : ''} onClick={() => setFilterUser('none')}><Ic name="hand" s={13} /> {tt('pd.toTakeCap')}</button>
          <div className="status-filter-sep" />
          <button className={statusFilter === 'all' ? 'on' : ''} onClick={() => setStatusFilter('all')}>{tt('pd.allStatuses')}</button>
          {statuses.map((s) => <button key={s.key} className={statusFilter === s.key ? 'on' : ''} onClick={() => setStatusFilter(s.key)}><i style={{ background: s.color }} />{trTerm(s.label)}</button>)}
          {canManage(p.my_role) && !closed && (
            <div className="status-admin">
              <input value={newStatus} onChange={(e) => setNewStatus(e.target.value)} placeholder="Nouveau statut…" onKeyDown={(e) => { if (e.key === 'Enter') addStatus() }} />
              <button className="btn sm" disabled={statusBusy} onClick={addStatus}>{tt('action.add')}</button>
            </div>
          )}
        </aside>
        <section className="status-main">
          <div className="status-hint">{closed ? tt('pd.closedRO') : 'Glissez une tâche d’un statut à un autre. Les tâches se créent avec le bouton principal, puis se déplacent ici.'}</div>
          {p.tasks.length > 0 && (
            <div className="list-tools status-sort">
              <label className="lt-lbl">{tt('projects.sort')}</label>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as TaskSort)} aria-label="Trier les tâches par">
                <option value="priority">{tt('td.priority')}</option>
                <option value="due">{tt('td.due')}</option>
                <option value="title">{tt('projects.sortTitle')}</option>
                <option value="manual">{tt('projects.sortManual')}</option>
              </select>
              <button className="btn sm" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} title="Sens du tri">{sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}</button>
            </div>
          )}
          <div className="section-h">{tt('ad.tasks')}</div>
      {p.tasks.length === 0 && !loadingMore && <div className="empty"><div className="big">✓</div>{tt('pd.noTasks')}</div>}
          {renderUserStatusBoard()}
          {hasMore && loadMore && (
            <div className="sheet-actions" style={{ marginTop: 12 }}>
              <button className="btn ghost" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? tt('common.loading') : `Charger plus (${p.tasks.length}/${p.taskCount ?? '?'})`}
              </button>
            </div>
          )}
        </section>
      </div>
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
  async function save() {
    if (!name.trim()) { toastErr(tt('pd.nameEmpty')); return }
    setBusy(true)
    try { await api('PATCH', '/projects/' + p.id, { name: name.trim(), deadline: deadline || null, labelId: labelId || null }); toast(tt('pd.projUpd')); onSaved() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="Modifier le projet" onClose={onClose}>
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
    body.statusKey = f.statusKey
    body.transferredTo = f.statusKey === 'transferred' ? (f.transferredTo || null) : null
    setBusy(true)
    try { await api('PATCH', '/tasks/' + t.id, body); toast(tt('pd.taskUpd')); onSaved() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="Modifier la tâche" onClose={onClose}>
      {canEditMeta && (
        <>
          <div className="field"><label>{tt('qt.label')}</label>
            <MicInput value={f.title} onChange={(v) => setF({ ...f, title: v })} /></div>
          <div className="field"><label>{tt('pd.desc')}</label>
            <MicTextarea value={f.desc} onChange={(v) => setF({ ...f, desc: v })} placeholder="Détails, contexte…" /></div>
          <div className="field"><label>{tt('qt.type')}</label>
            <div className="type-pick">
              <button className={f.type === '' ? 'on' : ''} onClick={() => setF({ ...f, type: '' })}>{tt('vw.none')}</button>
              {typeOpts.map((t) => <button key={t} className={f.type === t ? 'on ' + typeTone(t) : ''} onClick={() => setF({ ...f, type: t })}>{t}</button>)}
            </div></div>
          <div className="field"><label>{tt('td.assignee')}</label>
            <select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
              <option value="">— À prendre (non assignée)</option>
              {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></div>
          <div className="field"><label>Échéance</label>
            <input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <label className="checkline"><input type="checkbox" checked={f.transferable} onChange={(e) => setF({ ...f, transferable: e.target.checked, statusKey: e.target.checked ? f.statusKey : (f.statusKey === 'transferred' ? 'todo' : f.statusKey) })} /> {tt('meet.transferable')}</label>
        </>
      )}
      {canLogHours && (
        <>
          <div className="field"><label>{tt('pd.estH')}</label>
            <input type="number" min="0" step="0.5" value={f.est} onChange={(e) => setF({ ...f, est: e.target.value })} placeholder="ex. 5" /></div>
          <div className="field"><label>{tt('pd.spentH')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" style={{ flex: 1 }} value={f.spent} onChange={(e) => setF({ ...f, spent: e.target.value })} placeholder="ex. 3" />
              <button className="btn sm" onClick={() => setF({ ...f, spent: '8' })} title={tt('pd.fullDay')}>{tt('pd.day8')}</button>
            </div></div>
        </>
      )}
      <div className="field"><label>{tt('td.priority')}</label>
        <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={f.prio === n ? 'on o' + n : ''} onClick={() => setF({ ...f, prio: n })}>P{n}</button>)}</div></div>
      <div className="field"><label>{tt('meet.status')}</label>
        <div className="type-pick">
          {(p.statuses || []).map((s) => {
            const blocked = s.key === 'transferred' && !f.transferable
            return <button key={s.key} disabled={blocked} className={(f.statusKey === s.key ? 'on' : '') + (blocked ? ' disabled' : '')} onClick={() => !blocked && setF({ ...f, statusKey: s.key })}><span className="status-dot-inline" style={{ background: s.color }} />{s.label}</button>
          })}
        </div></div>
      {f.statusKey === 'transferred' && (
        <div className="field"><label>{tt('pd.transferTo')}</label>
          <select value={f.transferredTo} onChange={(e) => setF({ ...f, transferredTo: e.target.value })}>
            <option value="">— Choisir une personne</option>
            {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></div>
      )}
      <TaskComments task={t} projectClosed={p.status === 'done'} />
      <TaskTimeline taskId={t.id} />
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={save}>{tt('action.save')}</button>
        <button className="btn ghost" onClick={onClose}>{tt('action.cancel')}</button>
      </div>
    </Modal>
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
