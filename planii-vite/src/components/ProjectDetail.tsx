import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr, Avatar, health, Modal } from '@/lib/ui'
import { TYPE_LABEL, ROLE_LABEL, INVITE_ROLES, canManage, formatDue, isOverdue } from '@/lib/dates'
import { memberPoints, projectPoints, levelOf, taskPoints } from '@/lib/points'
import { prio, prioMeta, PRIORITIES } from '@/lib/priority'
import { taskTypesOf, roleLibraryOf, typeTone } from '@/lib/tasktype'
import type { Member, Poll, Project, ProjectLabel, ProjectRole, Task, TaskComment, TaskEvent, TaskStatus, User } from '@/lib/types'
import { Meeting } from './Meeting'
import { Mic, MicInput, MicTextarea } from './Mic'
import { VoiceTaskWizard } from './VoiceTaskWizard'
import { useRealtime } from '@/lib/realtime'
import { taskComparator, type TaskSort, type Dir } from '@/lib/sort'

export function ProjectDetail({ id, me, onBack }: { id: string; me: User; onBack: () => void }) {
  const [p, setP] = useState<Project | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'taches' | 'equipe' | 'membres' | 'sondages' | 'activite'>('taches')
  const [meet, setMeet] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const load = useCallback(() => { api<{ project: Project }>('GET', '/projects/' + id).then((r) => setP(r.project)).catch((e) => setErr(e.message)) }, [id])
  useEffect(load, [load])
  useRealtime((m) => { if (m.type === 'project' && m.projectId === id) load() })

  if (err) return <div className="app project-detail-app"><div className="wrap"><button className="btn-link" onClick={onBack}>‹ Retour</button><div className="empty">{err}</div></div></div>
  if (!p) return <div className="app project-detail-app"><div className="wrap"><div className="empty">Chargement…</div></div></div>
  if (meet) return <Meeting p={p} me={me} onClose={() => setMeet(false)} />

  const h = health(p.tasks.length, p.tasks.filter((t) => t.done).length, p.status)
  const manage = canManage(p.my_role)
  const isOwner = me.id === p.owner_id
  const closed = p.status === 'done'
  const memberName = (uid: string | null) => { const m = p.members.find((x) => x.id === uid); return m ? m.name : '—' }

  async function closeProject() {
    try { await api('POST', '/projects/' + id + '/close'); setConfirmClose(false); toast('Projet clôturé ✓'); load() } catch (e: any) { toastErr(e.message) }
  }
  async function reopenProject() {
    try { await api('POST', '/projects/' + id + '/reopen'); toast('Projet réouvert ✓'); load() } catch (e: any) { toastErr(e.message) }
  }
  async function deleteProject() {
    try {
      const r = await api<{ notified: number }>('DELETE', '/projects/' + id)
      toast(r.notified > 0 ? `Projet supprimé ✓ — ${r.notified} membre(s) averti(s)` : 'Projet supprimé ✓')
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
        <button className="btn-link" onClick={onBack}>‹ Retour</button>
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row">
            <div>
              <p className="title-lg">{p.name}</p>
              <p className="sub"><span className="role-tag">{TYPE_LABEL[p.type]}</span> · ⭐ {projectPoints(p)} pts{p.deadline ? ` · livraison ${formatDue(p.deadline)}` : ''}</p>
            </div>
            <span className={'pill ' + (p.status === 'done' ? 'ok' : 'acc')}>{p.status === 'done' ? 'Terminé' : `${h.done}/${h.total}`}</span>
          </div>
          <div className="mini-bar"><i style={{ width: h.pct + '%', background: p.status === 'done' ? 'var(--ok)' : 'var(--accent)' }} /></div>
          <div className="sheet-actions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            {!closed && <button className="btn sm primary" onClick={() => setMeet(true)}>🎥 Meeting</button>}
            {manage && !closed && <button className="btn sm ghost" onClick={() => setConfirmClose(true)}>✓ Clôturer</button>}
            {isOwner && closed && p.canReopen && <button className="btn sm primary" onClick={reopenProject}>↻ Réouvrir</button>}
            {isOwner && !closed && <button className="btn sm ghost" onClick={() => setEditing(true)}>✏️ Modifier</button>}
            {isOwner && <button className="btn sm danger" onClick={() => setConfirmDel(true)}>🗑 Supprimer</button>}
          </div>
        </div>

        {closed && (
          <div className="banner closed-project-banner">
            <b>Projet clôturé.</b> Les tâches, le meeting, les sondages et les modifications sont bloqués.
            {isOwner && p.canReopen && p.reopenUntil ? ` Vous pouvez le réouvrir jusqu’au ${new Date(p.reopenUntil).toLocaleDateString('fr-FR')}.` : ''}
            {isOwner && !p.canReopen ? ' Le délai de réouverture de 30 jours est dépassé.' : ''}
          </div>
        )}

        {editing && <EditProject p={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
        {confirmClose && (
          <Modal title="Clôturer le projet ?" onClose={() => setConfirmClose(false)}>
            <p className="sub" style={{ marginTop: 0 }}>
              Le projet <b>« {p.name} »</b> passera en lecture seule : plus de meeting, plus de modification, plus d’action sur les tâches.
              Le propriétaire pourra le réouvrir pendant 30 jours.
            </p>
            <div className="sheet-actions">
              <button className="btn primary" onClick={closeProject}>Oui, clôturer</button>
              <button className="btn ghost" onClick={() => setConfirmClose(false)}>Annuler</button>
            </div>
          </Modal>
        )}
        {confirmDel && (
          <Modal title="Supprimer le projet ?" onClose={() => setConfirmDel(false)}>
            <p className="sub" style={{ marginTop: 0 }}>
              Le projet <b>« {p.name} »</b> sera supprimé définitivement, avec toutes ses tâches, sondages et son historique.
              {p.members.length > 1 ? ` Les ${p.members.length - 1} autre(s) membre(s) seront retirés et avertis.` : ''} Cette action est irréversible.
            </p>
            <div className="sheet-actions">
              <button className="btn danger" onClick={deleteProject}>Oui, supprimer</button>
              <button className="btn ghost" onClick={() => setConfirmDel(false)}>Annuler</button>
            </div>
          </Modal>
        )}

        <div className="tabs" style={{ marginTop: 6 }}>
          {([['taches', 'Tâches'], ['equipe', 'Équipe'], ['membres', 'Membres'], ['sondages', 'Sondages'], ['activite', 'Activité']] as const).map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'taches' && <TasksTab p={p} me={me} memberName={memberName} reload={load} />}
        {tab === 'equipe' && <TeamBoard p={p} me={me} reload={load} />}
        {tab === 'membres' && <MembersTab p={p} me={me} manage={manage} reload={load} />}
        {tab === 'sondages' && <PollsTab p={p} reload={load} />}
        {tab === 'activite' && <ActivityTab p={p} />}
      </div>
    </div>
  )
}

function TasksTab({ p, me, memberName, reload }: { p: Project; me: User; memberName: (id: string | null) => string; reload: () => void }) {
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
    { id: 'todo', key: 'todo', label: 'À faire', color: '#9a988f', position: 0, fixed: true },
    { id: 'in_progress', key: 'in_progress', label: 'En cours', color: '#3b82d6', position: 1, fixed: true },
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
    try { await api('POST', '/projects/' + p.id + '/tasks', { title: nf.title.trim(), description: nf.desc || null, type: nf.type || null, assigneeId: nf.assigneeId || null, due: nf.due || null, estHours: nf.est || null, priority: nf.priority, transferable: nf.transferable }); setNf({ title: '', desc: '', type: myTypes[0] || '', assigneeId: '', due: '', est: '', priority: 6, transferable: false }); setAdding(false); toast('Tâche créée ✓'); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function addSub(parentId: string) {
    if (!subTitle.trim()) return
    try { await api('POST', '/projects/' + p.id + '/tasks', { title: subTitle.trim(), parentId, priority: 6 }); setSubTitle(''); setAddSubFor(null); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function toggle(t: Task) { try { await api('PATCH', '/tasks/' + t.id, { done: !t.done }); if (!t.done) toast('Tâche terminée ✓'); reload() } catch (e: any) { toastErr(e.message) } }
  async function claim(t: Task) { try { await api('POST', '/tasks/' + t.id + '/claim', {}); toast('Tâche prise ✓'); reload() } catch (e: any) { toastErr(e.message) } }
  async function del(t: Task) { try { await api('DELETE', '/tasks/' + t.id); setDeleteId(null); toast('Tâche supprimée ✓'); reload() } catch (e: any) { toastErr(e.message) } }
  async function setPriority(t: Task, n: number) { try { await api('PATCH', '/tasks/' + t.id, { priority: n }); setPrioId(null); toast('Priorité P' + n); reload() } catch (e: any) { toastErr(e.message) } }
  async function moveTask(t: Task, statusKey: string) {
    if (statusKey === 'transferred' && !t.transferable) { toastErr('Cette tâche n’est pas transférable'); return }
    const other = p.members.find((m) => m.id !== (t.assigneeId || me.id))
    const transferTo = statusKey === 'transferred' ? (t.transferredTo || other?.id || t.assigneeId || null) : null
    try { await api('PATCH', '/tasks/' + t.id, { statusKey, transferredTo: transferTo }); setDragId(null); toast(statusKey === 'transferred' ? 'Tâche transférée ✓' : 'Statut mis à jour ✓'); reload() }
    catch (e: any) { toastErr(e.message); setDragId(null) }
  }
  async function transferTask(t: Task, userId: string) {
    try {
      await api('PATCH', '/tasks/' + t.id, { statusKey: 'transferred', transferredTo: userId })
      setTransferId(null)
      toast('Tâche transférée ✓')
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
      toast('Relance envoyée ✓')
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
          <button className={'check' + (t.done ? ' done' : ' ' + pm.ringCls) + (mine && !closed ? '' : ' locked')} disabled={!mine || closed} onClick={mine && !closed ? () => toggle(t) : undefined} title={closed ? 'Projet clôturé' : mine ? '' : 'Seul le responsable peut cocher'} aria-label="Cocher">{t.done ? '✓' : (mine && !closed ? '' : '🔒')}</button>
          <div className="tname">
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {pm.n < 6 && <span className={'pflag ' + pm.flagCls}>{pm.tag}</span>}
              {t.type && <span className={'ttype ' + typeTone(t.type)}>{t.type}</span>}
              <span style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
            </span>
            {t.description && <div className="sub" style={{ marginTop: 2 }}>{t.description}</div>}
            <div className="meta">
              <span className={'tag ' + (unassigned ? 'due' : 'client')}>{unassigned ? '👐 à prendre' : '👤 ' + memberName(t.assigneeId)}</span>
              {t.due && <span className={'tag ' + (over ? 'late' : 'due')}>📅 {formatDue(t.due)}</span>}
              {hasHours && <span className="tag hours">⏱ {t.spentHours != null ? t.spentHours + 'h' : '0h'}{t.estHours != null ? ` / ~${t.estHours}h` : ''}</span>}
              {t.transferable && <span className="tag acc">⇄ transférable</span>}
              {!!t.commentCount && <span className="tag due">💬 {t.commentCount}</span>}
              {subs.length > 0 && <span className="tag due">☑ {subDone}/{subs.length}</span>}
              <span className="tag due">{statuses.find((s) => s.key === statusOf(t))?.label || 'À faire'}</span>
              {statusOf(t) === 'transferred' && <span className="tag acc">↪ {nameOf(t.transferredFrom)} → {nameOf(t.transferredTo)}</span>}
              {t.transferHistory && t.transferHistory.length > 0 && <span className="tag due">parcours {t.transferHistory.length}</span>}
            </div>
            {t.transferHistory && t.transferHistory.length > 0 && (
              <div className="transfer-path">
                {t.transferHistory.map((h) => <span key={h.id}>{h.fromName || 'Départ'} → {h.toName}</span>)}
              </div>
            )}
          </div>
          {hasMenu && <button className="more-btn" onClick={() => setMenuId(t.id)} aria-label="Actions">⋯</button>}
        </div>
        {canRelance && <div className="relance"><span>En retard — relancer {memberName(t.assigneeId)} ?</span><button onClick={() => relance(t)}>Relancer ✉</button></div>}
        {menuId === t.id && (
          <Modal title={t.title} onClose={() => setMenuId(null)}>
            {(canEditMeta || canLogHours) && <button className="mact" onClick={() => { setMenuId(null); setEditId(t.id) }}><span className="mi">✏️</span>Modifier la tâche</button>}
            {!isSub && !closed && <button className="mact" onClick={() => { setMenuId(null); setSubTitle(''); setAddSubFor(t.id) }}><span className="mi">➕</span>Ajouter une sous-tâche</button>}
            {canPrio && <button className="mact" onClick={() => { setMenuId(null); setPrioId(t.id) }}><span className="mi">🚩</span>Changer la priorité</button>}
            {canTransfer && <button className="mact" onClick={() => { setMenuId(null); setTransferId(t.id) }}><span className="mi">⇄</span>Transférer la tâche</button>}
            {unassigned && !closed && <button className="mact" onClick={() => { setMenuId(null); claim(t) }}><span className="mi">👐</span>Je m’en occupe</button>}
            {canRelance && <button className="mact" onClick={() => { setMenuId(null); relance(t) }}><span className="mi">✉️</span>Relancer</button>}
            {canDel && <button className="mact danger" onClick={() => { setMenuId(null); setDeleteId(t.id) }}><span className="mi">🗑</span>Supprimer{subs.length > 0 ? ' (et ses sous-tâches)' : ''}</button>}
          </Modal>
        )}
        {transferId === t.id && <TransferTaskModal p={p} t={t} me={me} onClose={() => setTransferId(null)} onTransfer={(userId) => transferTask(t, userId)} />}
        {deleteId === t.id && (
          <Modal title="Supprimer la tâche ?" onClose={() => setDeleteId(null)}>
            <p className="sub" style={{ marginTop: 0 }}>
              La tâche <b>« {t.title} »</b>{subs.length > 0 ? ' et ses sous-tâches' : ''} seront supprimées définitivement.
            </p>
            <div className="sheet-actions">
              <button className="btn danger" onClick={() => del(t)}>Oui, supprimer</button>
              <button className="btn ghost" onClick={() => setDeleteId(null)}>Annuler</button>
            </div>
          </Modal>
        )}
        {prioId === t.id && (
          <Modal title="Priorité" onClose={() => setPrioId(null)}>
            {PRIORITIES.map((n) => (
              <button key={n} className="prow" onClick={() => setPriority(t, n)}>
                <span className={'pflag ' + prioMeta(n).flagCls} style={{ width: 30, textAlign: 'center' }}>{prioMeta(n).tag}</span>
                <span style={{ flex: 1 }}>Priorité {n}{n === 1 ? ' — la plus urgente' : n === 6 ? ' — la plus basse' : ''}</span>
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
                <input autoFocus value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="Nouvelle sous-tâche…" onKeyDown={(e) => { if (e.key === 'Enter') addSub(t.id) }} />
                <Mic value={subTitle} onChange={setSubTitle} />
                <button className="btn sm primary" onClick={() => addSub(t.id)}>Ajouter</button>
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
        <div className="grp-h">{k ? '👤 ' + (member(k)?.name || '—') : '👐 À prendre'} · {map.get(k)!.length}</div>
        {map.get(k)!.map(renderRoot)}
      </div>
    ))
  }

  const sectionMembers = () => {
    const base = p.members.map((m) => ({ id: m.id, name: m.name }))
    const hasUnassigned = roots.some((t) => !t.assigneeId)
    const withNone = hasUnassigned ? [...base, { id: 'none', name: 'À prendre' }] : base
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
          <span className="user-status-count">{personTasks.length} tâche{personTasks.length > 1 ? 's' : ''}</span>
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
                  <div className="status-drop-label">Déposer ici</div>
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
          <button className="btn primary" onClick={() => setVoice(true)} title="Créer une tâche à la voix">🎤 Dicter une tâche</button>
        </div>
      )}
      {voice && <VoiceTaskWizard p={p} me={me} onClose={() => setVoice(false)} onCreated={() => { setVoice(false); reload() }} />}
      {adding && (
        <div className="card">
          <div className="field"><label>Intitulé</label>
            <MicInput value={nf.title} onChange={(v) => setNf({ ...nf, title: v })} placeholder="Ex. Envoyer les visuels" /></div>
          <div className="field"><label>Description (optionnel)</label>
            <MicTextarea value={nf.desc} onChange={(v) => setNf({ ...nf, desc: v })} placeholder="Détails, contexte…" /></div>
          <div className="field"><label>Type</label>
            <div className="type-pick">
              <button className={nf.type === '' ? 'on' : ''} onClick={() => setNf({ ...nf, type: '' })}>Aucun</button>
              {myTypes.map((t) => <button key={t} className={nf.type === t ? 'on ' + typeTone(t) : ''} onClick={() => setNf({ ...nf, type: t })}>{t}</button>)}
            </div></div>
          <div className="field"><label>Responsable</label>
            <select value={nf.assigneeId} onChange={(e) => setNf({ ...nf, assigneeId: e.target.value })}>
              <option value="">— À prendre (non assignée)</option>
              {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === me.id ? ' (moi)' : ''}</option>)}
            </select></div>
          <div className="field"><label>Échéance</label><input type="date" value={nf.due} onChange={(e) => setNf({ ...nf, due: e.target.value })} /></div>
          <div className="field"><label>Priorité</label>
            <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={nf.priority === n ? 'on o' + n : ''} onClick={() => setNf({ ...nf, priority: n })}>P{n}</button>)}</div></div>
          <label className="checkline"><input type="checkbox" checked={nf.transferable} onChange={(e) => setNf({ ...nf, transferable: e.target.checked })} /> Tâche transférable</label>
          <div className="field"><label>Heures estimées (optionnel)</label><input type="number" min="0" step="0.5" value={nf.est} onChange={(e) => setNf({ ...nf, est: e.target.value })} placeholder="ex. 5" /></div>
          <div className="sheet-actions"><button className="btn primary sm" onClick={addTask}>Ajouter</button><button className="btn ghost sm" onClick={() => setAdding(false)}>Annuler</button></div>
        </div>
      )}
      <div className="status-workspace">
        <aside className="status-filter">
          <div className="status-filter-title">Filtrer</div>
          <button className={filterUser === 'all' ? 'on' : ''} onClick={() => setFilterUser('all')}>👥 Tout le monde</button>
          {p.members.map((m) => <button key={m.id} className={filterUser === m.id ? 'on' : ''} onClick={() => setFilterUser(m.id)}><Avatar name={m.name} size={26} />{m.name.split(' ')[0]}</button>)}
          <button className={filterUser === 'none' ? 'on' : ''} onClick={() => setFilterUser('none')}>👐 À prendre</button>
          <div className="status-filter-sep" />
          <button className={statusFilter === 'all' ? 'on' : ''} onClick={() => setStatusFilter('all')}>Tous les statuts</button>
          {statuses.map((s) => <button key={s.key} className={statusFilter === s.key ? 'on' : ''} onClick={() => setStatusFilter(s.key)}><i style={{ background: s.color }} />{s.label}</button>)}
          {canManage(p.my_role) && !closed && (
            <div className="status-admin">
              <input value={newStatus} onChange={(e) => setNewStatus(e.target.value)} placeholder="Nouveau statut…" onKeyDown={(e) => { if (e.key === 'Enter') addStatus() }} />
              <button className="btn sm" disabled={statusBusy} onClick={addStatus}>Ajouter</button>
            </div>
          )}
        </aside>
        <section className="status-main">
          <div className="status-hint">{closed ? 'Projet clôturé : les tâches sont affichées en lecture seule.' : 'Glissez une tâche d’un statut à un autre. Les tâches se créent avec le bouton principal, puis se déplacent ici.'}</div>
          {p.tasks.length > 0 && (
            <div className="list-tools status-sort">
              <label className="lt-lbl">Trier</label>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as TaskSort)} aria-label="Trier les tâches par">
                <option value="priority">Priorité</option>
                <option value="due">Échéance</option>
                <option value="title">Titre</option>
                <option value="manual">Manuel</option>
              </select>
              <button className="btn sm" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} title="Sens du tri">{sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}</button>
            </div>
          )}
          <div className="section-h">Tâches</div>
      {p.tasks.length === 0 && <div className="empty"><div className="big">✓</div>Aucune tâche pour l’instant.</div>}
          {renderUserStatusBoard()}
        </section>
      </div>
    </div>
  )
}

function TeamBoard({ p, me, reload }: { p: Project; me: User; reload: () => void }) {
  const closed = p.status === 'done'
  async function toggle(t: Task) { try { await api('PATCH', '/tasks/' + t.id, { done: !t.done }); if (!t.done) toast('+ points 🎉'); reload() } catch (e: any) { toastErr(e.message) } }
  const ranked = [...p.members].map((m) => ({ m, pts: memberPoints(p, m.id) })).sort((a, b) => b.pts - a.pts)
  const unassigned = p.tasks.filter((t) => !t.assigneeId && !t.done)
  return (
    <div>
      <div className="banner">Chaque tâche cochée fait monter le score (en avance 20 · le jour même 15 · en retard 5). Total équipe : ⭐ {projectPoints(p)} pts</div>
      <div className="board">
        {ranked.map(({ m, pts }, i) => {
          const l = levelOf(pts)
          const tasks = p.tasks.filter((t) => t.assigneeId === m.id).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
          return (
            <div key={m.id} className={'board-col' + (i === 0 && pts > 0 ? ' lead' : '')}>
              <div className="board-head">
                <div className="board-who"><Avatar name={m.name} /><div><div className="nm">{m.name}{m.id === me.id ? ' (moi)' : ''}</div><div className="sc">{l.medal} Niveau {l.level}</div></div></div>
                <div className="board-pts">{pts}<span>pts</span></div>
              </div>
              <div className="score-bar sm"><i style={{ width: l.pct + '%' }} /></div>
              <div className="board-tasks">
                {tasks.length === 0 && <div className="sub" style={{ padding: '6px 2px' }}>Aucune tâche</div>}
                {tasks.map((t) => {
                  const mine = t.assigneeId === me.id
                  return (
                    <div key={t.id} className={'board-task' + (t.done ? ' done' : '')}>
                      <button className={'check' + (t.done ? ' done' : '') + (mine && !closed ? '' : ' locked')} disabled={!mine || closed} onClick={mine && !closed ? () => toggle(t) : undefined} aria-label="Cocher">{t.done ? '✓' : (mine && !closed ? '' : '🔒')}</button>
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
            <div className="board-head"><div className="board-who"><span className="avatar">👐</span><div><div className="nm">À prendre</div><div className="sc">non assignées</div></div></div></div>
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
    try { const r = await api<{ role: string; link: string }>('POST', '/projects/' + p.id + '/invites', { role }); setLinks((l) => [r, ...l]); toast('Lien d’invitation créé') }
    catch (e: any) { toastErr(e.message) }
  }
  function copy(link: string) { (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast('Lien copié 📋')).catch(() => toast('Copie indisponible')) }
  async function addRole(name?: string) {
    const nm = (name ?? newRole).trim(); if (!nm) return
    try { await api('POST', '/projects/' + p.id + '/roles', { name: nm }); if (!name) setNewRole(''); toast('Rôle ajouté ✓'); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function delRole(id: string) {
    try { await api('DELETE', '/projects/' + p.id + '/roles/' + id); reload() } catch (e: any) { toastErr(e.message) }
  }
  async function saveAssign(memberId: string, roleIds: string[]) {
    try { await api('PUT', '/projects/' + p.id + '/members/' + memberId + '/roles', { roleIds }); setAssignFor(null); toast('Rôles mis à jour ✓'); reload() }
    catch (e: any) { toastErr(e.message) }
  }

  return (
    <div>
      {manage && p.status !== 'done' && (
        <>
          <div className="section-h">Rôles du projet</div>
          <div className="card">
            <p className="sub" style={{ marginTop: 0 }}>Crée des rôles (ex. Chef de projet, Développeur) puis assigne-les aux membres.</p>
            <div className="chips">
              {roles.map((r) => (
                <span key={r.id} className={'chip ' + typeTone(r.name)}>{r.name}
                  <button className="chip-x" onClick={() => delRole(r.id)} aria-label={'Supprimer ' + r.name}>×</button>
                </span>
              ))}
              {roles.length === 0 && <span className="sub">Aucun rôle pour l’instant.</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input style={{ flex: 1 }} value={newRole} maxLength={40} placeholder="Nouveau rôle…" onChange={(e) => setNewRole(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addRole() }} />
              <Mic value={newRole} onChange={setNewRole} />
              <button className="btn sm" onClick={() => addRole()}>Ajouter</button>
            </div>
            {suggestions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p className="sub" style={{ margin: '0 0 6px' }}>Depuis ta bibliothèque :</p>
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
          {manage && roles.length > 0 && <button className="btn ghost sm" onClick={() => setAssignFor(m)}>Rôles</button>}
        </div>
      ))}

      {assignFor && (
        <AssignRoles member={assignFor} roles={roles} onClose={() => setAssignFor(null)} onSave={(ids) => saveAssign(assignFor.id, ids)} />
      )}

      {manage && p.status !== 'done' && (
        <>
          <div className="section-h">Inviter</div>
          <div className="banner">Générez un lien à envoyer. Le lien « client » est à usage unique ; les autres sont réutilisables.</div>
          <div className="sheet-actions" style={{ flexWrap: 'wrap' }}>
            {(INVITE_ROLES[p.type] || []).map(([role, label]) => <button key={role} className="btn sm" onClick={() => invite(role)}>＋ Lien {label}</button>)}
          </div>
          {links.map((lk, i) => (
            <div key={i} className="card" style={{ marginTop: 10 }}>
              <p className="sub" style={{ margin: '0 0 6px' }}>Invitation <b>{ROLE_LABEL[lk.role] || lk.role}</b> :</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={lk.link} style={{ flex: 1, fontSize: '12.5px' }} onFocus={(e) => e.currentTarget.select()} />
                <button className="btn sm primary" onClick={() => copy(lk.link)}>Copier</button>
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
    <Modal title={'Rôles de ' + member.name} onClose={onClose}>
      <p className="sub" style={{ marginTop: 0 }}>Coche les rôles à attribuer à ce membre.</p>
      {roles.map((r) => (
        <button key={r.id} className="prow" onClick={() => toggle(r.id)}>
          <span className={'chip sm ' + typeTone(r.name)}>{r.name}</span>
          <span style={{ flex: 1 }} />
          {sel.includes(r.id) ? '✓' : ''}
        </button>
      ))}
      <div className="sheet-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={() => onSave(sel)}>Enregistrer</button>
        <button className="btn ghost" onClick={onClose}>Annuler</button>
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
          <div className="field"><label>Question</label><MicInput value={q} onChange={setQ} placeholder="Ex. Quelle date pour le lancement ?" /></div>
          {opts.map((o, i) => <div className="field" key={i}><label>Option {i + 1}</label><MicInput value={o} onChange={(v) => { const c = [...opts]; c[i] = v; setOpts(c) }} /></div>)}
          <button className="btn-link" onClick={() => setOpts([...opts, ''])}>＋ Ajouter une option</button>
          <div className="sheet-actions"><button className="btn primary sm" onClick={create}>Lancer le sondage</button><button className="btn ghost sm" onClick={() => setAdding(false)}>Annuler</button></div>
        </div>
      )}
      {p.polls.length === 0 && <div className="empty">Aucun sondage.</div>}
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
    if (!name.trim()) { toastErr('Le nom ne peut pas être vide'); return }
    setBusy(true)
    try { await api('PATCH', '/projects/' + p.id, { name: name.trim(), deadline: deadline || null, labelId: labelId || null }); toast('Projet mis à jour ✓'); onSaved() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      <div className="field"><label>Nom du projet</label>
        <MicInput value={name} onChange={setName} placeholder="Nom du projet" /></div>
      <div className="field"><label>Date de livraison</label>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
      <div className="field"><label>Liste de libellés</label>
        <select value={labelId} onChange={(e) => setLabelId(e.target.value)}>
          {labels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={save}>Enregistrer</button>
        <button className="btn ghost" onClick={onClose}>Annuler</button>
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
      if (!f.title.trim()) { toastErr('L’intitulé ne peut pas être vide'); return }
      body.title = f.title.trim(); body.description = f.desc || null; body.type = f.type || null; body.due = f.due || null; body.assigneeId = f.assigneeId || null; body.transferable = f.transferable
    }
    if (canLogHours) {
      body.estHours = f.est === '' ? null : Number(f.est)
      body.spentHours = f.spent === '' ? null : Number(f.spent)
    }
    body.statusKey = f.statusKey
    body.transferredTo = f.statusKey === 'transferred' ? (f.transferredTo || null) : null
    setBusy(true)
    try { await api('PATCH', '/tasks/' + t.id, body); toast('Tâche mise à jour ✓'); onSaved() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="Modifier la tâche" onClose={onClose}>
      {canEditMeta && (
        <>
          <div className="field"><label>Intitulé</label>
            <MicInput value={f.title} onChange={(v) => setF({ ...f, title: v })} /></div>
          <div className="field"><label>Description</label>
            <MicTextarea value={f.desc} onChange={(v) => setF({ ...f, desc: v })} placeholder="Détails, contexte…" /></div>
          <div className="field"><label>Type</label>
            <div className="type-pick">
              <button className={f.type === '' ? 'on' : ''} onClick={() => setF({ ...f, type: '' })}>Aucun</button>
              {typeOpts.map((t) => <button key={t} className={f.type === t ? 'on ' + typeTone(t) : ''} onClick={() => setF({ ...f, type: t })}>{t}</button>)}
            </div></div>
          <div className="field"><label>Responsable</label>
            <select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
              <option value="">— À prendre (non assignée)</option>
              {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></div>
          <div className="field"><label>Échéance</label>
            <input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <label className="checkline"><input type="checkbox" checked={f.transferable} onChange={(e) => setF({ ...f, transferable: e.target.checked, statusKey: e.target.checked ? f.statusKey : (f.statusKey === 'transferred' ? 'todo' : f.statusKey) })} /> Tâche transférable</label>
        </>
      )}
      {canLogHours && (
        <>
          <div className="field"><label>Heures estimées</label>
            <input type="number" min="0" step="0.5" value={f.est} onChange={(e) => setF({ ...f, est: e.target.value })} placeholder="ex. 5" /></div>
          <div className="field"><label>Heures passées</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" min="0" step="0.5" style={{ flex: 1 }} value={f.spent} onChange={(e) => setF({ ...f, spent: e.target.value })} placeholder="ex. 3" />
              <button className="btn sm" onClick={() => setF({ ...f, spent: '8' })} title="Journée entière">Journée (8h)</button>
            </div></div>
        </>
      )}
      <div className="field"><label>Priorité</label>
        <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={f.prio === n ? 'on o' + n : ''} onClick={() => setF({ ...f, prio: n })}>P{n}</button>)}</div></div>
      <div className="field"><label>Statut</label>
        <div className="type-pick">
          {(p.statuses || []).map((s) => {
            const blocked = s.key === 'transferred' && !f.transferable
            return <button key={s.key} disabled={blocked} className={(f.statusKey === s.key ? 'on' : '') + (blocked ? ' disabled' : '')} onClick={() => !blocked && setF({ ...f, statusKey: s.key })}><span className="status-dot-inline" style={{ background: s.color }} />{s.label}</button>
          })}
        </div></div>
      {f.statusKey === 'transferred' && (
        <div className="field"><label>Transféré à</label>
          <select value={f.transferredTo} onChange={(e) => setF({ ...f, transferredTo: e.target.value })}>
            <option value="">— Choisir une personne</option>
            {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></div>
      )}
      <TaskComments task={t} projectClosed={p.status === 'done'} />
      <TaskTimeline taskId={t.id} />
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={save}>Enregistrer</button>
        <button className="btn ghost" onClick={onClose}>Annuler</button>
      </div>
    </Modal>
  )
}

function TransferTaskModal({ p, t, me, onClose, onTransfer }: { p: Project; t: Task; me: User; onClose: () => void; onTransfer: (userId: string) => void }) {
  const current = t.assigneeId || me.id
  const targets = p.members.filter((m) => m.id !== current)
  return (
    <Modal title="Transférer la tâche" onClose={onClose}>
      <p className="sub" style={{ marginTop: 0 }}>Choisis la personne à qui transférer <b>« {t.title} »</b>.</p>
      {targets.length === 0 && <div className="empty">Aucun autre membre disponible.</div>}
      {targets.map((m) => (
        <button key={m.id} className="prow" onClick={() => onTransfer(m.id)}>
          <Avatar name={m.name} size={30} />
          <span style={{ flex: 1 }}>
            <b>{m.name}</b>
            <span className="sub" style={{ display: 'block', fontSize: '12px' }}>{ROLE_LABEL[m.role] || m.role}{m.id === me.id ? ' · moi' : ''}</span>
          </span>
          <span>Transférer</span>
        </button>
      ))}
      <div className="sheet-actions" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onClose}>Annuler</button>
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
      toast('Commentaire ajouté ✓')
    } catch (e: any) { toastErr(e.message) }
    finally { setBusy(false) }
  }
  async function remove(c: TaskComment) {
    try {
      await api('DELETE', '/task-comments/' + c.id)
      setComments((list) => (list || []).map((x) => x.id === c.id ? { ...x, body: '[commentaire supprimé]', deleted: true, canDelete: false } : x))
      toast('Commentaire supprimé ✓')
    } catch (e: any) { toastErr(e.message) }
  }

  return (
    <div className="task-side-panel">
      <div className="task-side-head"><b>Commentaires</b><span>{comments ? comments.filter((c) => !c.deleted).length : 0}</span></div>
      {!comments && <div className="sub">Chargement…</div>}
      {comments && comments.length === 0 && <div className="sub">Aucun commentaire pour l’instant.</div>}
      <div className="task-comments">
        {(comments || []).map((c) => (
          <div key={c.id} className={'task-comment' + (c.deleted ? ' deleted' : '')}>
            <Avatar name={c.userName} size={26} />
            <div>
              <div className="task-comment-meta"><b>{c.userName}</b><span>{new Date(c.at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
              <p>{c.body}</p>
              {c.canDelete && <button className="btn-link" onClick={() => remove(c)}>Supprimer</button>}
            </div>
          </div>
        ))}
      </div>
      {!projectClosed && (
        <div className="task-comment-form">
          <MicTextarea value={body} onChange={setBody} placeholder="Ajouter un commentaire…" />
          <button className="btn primary sm" disabled={busy || !body.trim()} onClick={add}>Commenter</button>
        </div>
      )}
    </div>
  )
}

const EVENT_LABEL: Record<string, string> = {
  task_created: 'Tâche créée',
  task_done: 'Tâche terminée',
  task_reopened: 'Tâche rouverte',
  task_status_changed: 'Statut modifié',
  task_transferred: 'Tâche transférée',
  task_hours_updated: 'Heures mises à jour',
  task_priority_changed: 'Priorité modifiée',
  task_updated: 'Tâche modifiée',
  task_claimed: 'Tâche prise',
  task_reminded: 'Relance envoyée',
  task_deleted: 'Tâche supprimée',
  comment_added: 'Commentaire ajouté',
  comment_deleted: 'Commentaire supprimé',
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
      <div className="task-side-head"><b>Historique</b><span>{events ? events.length : 0}</span></div>
      {!events && <div className="sub">Chargement…</div>}
      {events && events.length === 0 && <div className="sub">Aucun historique pour l’instant.</div>}
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

function ActivityTab({ p }: { p: Project }) {
  if (!p.activity.length) return <div className="empty">Aucune activité pour l’instant.</div>
  return (
    <div style={{ marginTop: 6 }}>
      {p.activity.map((a) => (
        <div key={a.id} className="act-row">
          <span className="act-dot" />
          <div>
            <span style={{ fontWeight: 600 }}>{a.user || 'Quelqu’un'}</span> <span className="sub" style={{ display: 'inline' }}>{a.detail}</span>
            <div className="sub" style={{ fontSize: '11.5px' }}>{new Date(a.at).toLocaleString('fr-FR')}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
