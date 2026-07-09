import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr, Avatar, health, Modal } from '@/lib/ui'
import { TYPE_LABEL, ROLE_LABEL, INVITE_ROLES, canManage, formatDue, isOverdue } from '@/lib/dates'
import { memberPoints, projectPoints, levelOf, taskPoints } from '@/lib/points'
import { prio, prioMeta, PRIORITIES } from '@/lib/priority'
import { taskTypesOf, roleLibraryOf, typeTone } from '@/lib/tasktype'
import type { Member, Poll, Project, ProjectRole, Task, User } from '@/lib/types'
import { Meeting } from './Meeting'
import { Mic, MicInput, MicTextarea } from './Mic'
import { VoiceTaskWizard } from './VoiceTaskWizard'

export function ProjectDetail({ id, me, onBack }: { id: string; me: User; onBack: () => void }) {
  const [p, setP] = useState<Project | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'taches' | 'equipe' | 'membres' | 'sondages' | 'activite'>('taches')
  const [meet, setMeet] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const load = useCallback(() => { api<{ project: Project }>('GET', '/projects/' + id).then((r) => setP(r.project)).catch((e) => setErr(e.message)) }, [id])
  useEffect(load, [load])

  if (err) return <div className="app"><div className="wrap"><button className="btn-link" onClick={onBack}>‹ Retour</button><div className="empty">{err}</div></div></div>
  if (!p) return <div className="app"><div className="wrap"><div className="empty">Chargement…</div></div></div>
  if (meet) return <Meeting p={p} me={me} onClose={() => setMeet(false)} />

  const h = health(p.tasks.length, p.tasks.filter((t) => t.done).length, p.status)
  const manage = canManage(p.my_role)
  const isOwner = me.id === p.owner_id
  const memberName = (uid: string | null) => { const m = p.members.find((x) => x.id === uid); return m ? m.name : '—' }

  async function closeProject() {
    try { await api('POST', '/projects/' + id + '/close'); toast('Projet clôturé'); load() } catch (e: any) { toastErr(e.message) }
  }
  async function deleteProject() {
    try {
      const r = await api<{ notified: number }>('DELETE', '/projects/' + id)
      toast(r.notified > 0 ? `Projet supprimé — ${r.notified} membre(s) averti(s)` : 'Projet supprimé')
      onBack()
    } catch (e: any) { toastErr(e.message) }
  }

  return (
    <div className="app">
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
            <button className="btn sm primary" onClick={() => setMeet(true)}>🎥 Meeting</button>
            {manage && p.status !== 'done' && h.total > 0 && <button className="btn sm ghost" onClick={closeProject}>✓ Clôturer</button>}
            {isOwner && <button className="btn sm ghost" onClick={() => setEditing(true)}>✏️ Modifier</button>}
            {isOwner && <button className="btn sm danger" onClick={() => setConfirmDel(true)}>🗑 Supprimer</button>}
          </div>
        </div>

        {editing && <EditProject p={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
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
  const [nf, setNf] = useState<{ title: string; desc: string; type: string; assigneeId: string; due: string; est: string; priority: number }>({ title: '', desc: '', type: myTypes[0] || '', assigneeId: '', due: '', est: '', priority: 6 })
  const [editId, setEditId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [prioId, setPrioId] = useState<string | null>(null)
  const [addSubFor, setAddSubFor] = useState<string | null>(null)
  const [subTitle, setSubTitle] = useState('')
  const member = (id: string | null) => p.members.find((x) => x.id === id)

  async function addTask() {
    if (!nf.title.trim()) return
    try { await api('POST', '/projects/' + p.id + '/tasks', { title: nf.title.trim(), description: nf.desc || null, type: nf.type || null, assigneeId: nf.assigneeId || null, due: nf.due || null, estHours: nf.est || null, priority: nf.priority }); setNf({ title: '', desc: '', type: myTypes[0] || '', assigneeId: '', due: '', est: '', priority: 6 }); setAdding(false); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function addSub(parentId: string) {
    if (!subTitle.trim()) return
    try { await api('POST', '/projects/' + p.id + '/tasks', { title: subTitle.trim(), parentId, priority: 6 }); setSubTitle(''); setAddSubFor(null); reload() }
    catch (e: any) { toastErr(e.message) }
  }
  async function toggle(t: Task) { try { await api('PATCH', '/tasks/' + t.id, { done: !t.done }); reload() } catch (e: any) { toastErr(e.message) } }
  async function claim(t: Task) { try { await api('POST', '/tasks/' + t.id + '/claim', {}); toast('Tâche prise ✓'); reload() } catch (e: any) { toastErr(e.message) } }
  async function del(t: Task) { try { await api('DELETE', '/tasks/' + t.id); reload() } catch (e: any) { toastErr(e.message) } }
  async function setPriority(t: Task, n: number) { try { await api('PATCH', '/tasks/' + t.id, { priority: n }); setPrioId(null); toast('Priorité P' + n); reload() } catch (e: any) { toastErr(e.message) } }

  function relance(t: Task) {
    const m = member(t.assigneeId); if (!m || !m.email) { toastErr('Pas d’email pour ce membre'); return }
    const subject = `Petit rappel — ${p.name}`
    const body = `Bonjour ${m.name},\n\nUn petit rappel amical : la tâche « ${t.title} » est en attente${t.due ? ` (échéance ${formatDue(t.due)})` : ''}.\nDès que c'est fait de votre côté, on peut avancer. Merci !\n\nBien à vous`
    window.location.href = `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    toast('Email de relance ouvert ✉')
  }

  const overdue = p.tasks.filter((t) => isOverdue(t))
  const sorted = [...p.tasks].sort((a, b) => {
    const da = a.done ? 1 : 0, db = b.done ? 1 : 0; if (da !== db) return da - db
    const pa = prio(a.priority), pb = prio(b.priority); if (pa !== pb) return pa - pb
    return (a.due || '9999').localeCompare(b.due || '9999')
  })
  const roots = sorted.filter((t) => !t.parentId)

  const renderTask = (t: Task, isSub = false) => {
    const over = isOverdue(t)
    const mine = t.assigneeId === me.id
    const unassigned = !t.assigneeId
    const am = member(t.assigneeId)
    const canRelance = over && !mine && !unassigned && am && am.email
    const manage = canManage(p.my_role)
    const canDel = t.createdBy === me.id || manage
    const canEditMeta = t.createdBy === me.id || manage
    const canLogHours = mine || manage
    const hasHours = t.spentHours != null || t.estHours != null
    const pm = prioMeta(t.priority)
    const canPrio = mine || canEditMeta
    const subs = isSub ? [] : p.tasks.filter((s) => s.parentId === t.id)
    const subDone = subs.filter((s) => s.done).length
    const hasMenu = canEditMeta || canLogHours || canDel || canPrio || (unassigned && p.status !== 'done')
    return (
      <div key={t.id} className={'task' + (isSub ? ' subtask' : '') + (t.done ? ' done' : '') + (over ? ' overdue' : '')}>
        <div className="tt">
          <button className={'check' + (t.done ? ' done' : ' ' + pm.ringCls) + (mine ? '' : ' locked')} disabled={!mine} onClick={mine ? () => toggle(t) : undefined} title={mine ? '' : 'Seul le responsable peut cocher'} aria-label="Cocher">{t.done ? '✓' : (mine ? '' : '🔒')}</button>
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
              {subs.length > 0 && <span className="tag due">☑ {subDone}/{subs.length}</span>}
            </div>
          </div>
          {hasMenu && <button className="more-btn" onClick={() => setMenuId(t.id)} aria-label="Actions">⋯</button>}
        </div>
        {canRelance && <div className="relance"><span>En retard — relancer {memberName(t.assigneeId)} ?</span><button onClick={() => relance(t)}>Relancer ✉</button></div>}
        {menuId === t.id && (
          <Modal title={t.title} onClose={() => setMenuId(null)}>
            {(canEditMeta || canLogHours) && <button className="mact" onClick={() => { setMenuId(null); setEditId(t.id) }}><span className="mi">✏️</span>Modifier la tâche</button>}
            {!isSub && p.status !== 'done' && <button className="mact" onClick={() => { setMenuId(null); setSubTitle(''); setAddSubFor(t.id) }}><span className="mi">➕</span>Ajouter une sous-tâche</button>}
            {canPrio && <button className="mact" onClick={() => { setMenuId(null); setPrioId(t.id) }}><span className="mi">🚩</span>Changer la priorité</button>}
            {unassigned && p.status !== 'done' && <button className="mact" onClick={() => { setMenuId(null); claim(t) }}><span className="mi">👐</span>Je m’en occupe</button>}
            {canRelance && <button className="mact" onClick={() => { setMenuId(null); relance(t) }}><span className="mi">✉️</span>Relancer</button>}
            {canDel && <button className="mact danger" onClick={() => { setMenuId(null); del(t) }}><span className="mi">🗑</span>Supprimer{subs.length > 0 ? ' (et ses sous-tâches)' : ''}</button>}
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
          <div className="field"><label>Heures estimées (optionnel)</label><input type="number" min="0" step="0.5" value={nf.est} onChange={(e) => setNf({ ...nf, est: e.target.value })} placeholder="ex. 5" /></div>
          <div className="sheet-actions"><button className="btn primary sm" onClick={addTask}>Ajouter</button><button className="btn ghost sm" onClick={() => setAdding(false)}>Annuler</button></div>
        </div>
      )}
      <div className="section-h">Tâches</div>
      {p.tasks.length === 0 && <div className="empty"><div className="big">✓</div>Aucune tâche pour l’instant.</div>}
      {roots.map((t) => {
        const subs = p.tasks.filter((s) => s.parentId === t.id).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || prio(a.priority) - prio(b.priority))
        return (
          <div key={t.id} className="task-group">
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
      })}
    </div>
  )
}

function TeamBoard({ p, me, reload }: { p: Project; me: User; reload: () => void }) {
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
                      <button className={'check' + (t.done ? ' done' : '') + (mine ? '' : ' locked')} disabled={!mine} onClick={mine ? () => toggle(t) : undefined} aria-label="Cocher">{t.done ? '✓' : (mine ? '' : '🔒')}</button>
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
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!name.trim()) { toastErr('Le nom ne peut pas être vide'); return }
    setBusy(true)
    try { await api('PATCH', '/projects/' + p.id, { name: name.trim(), deadline: deadline || null }); toast('Projet mis à jour ✓'); onSaved() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      <div className="field"><label>Nom du projet</label>
        <MicInput value={name} onChange={setName} placeholder="Nom du projet" /></div>
      <div className="field"><label>Date de livraison</label>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
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
  })
  const typeOpts = [...new Set([...types, ...(t.type ? [t.type] : [])])]
  const [busy, setBusy] = useState(false)
  async function save() {
    const body: any = { priority: f.prio }
    if (canEditMeta) {
      if (!f.title.trim()) { toastErr('L’intitulé ne peut pas être vide'); return }
      body.title = f.title.trim(); body.description = f.desc || null; body.type = f.type || null; body.due = f.due || null; body.assigneeId = f.assigneeId || null
    }
    if (canLogHours) {
      body.estHours = f.est === '' ? null : Number(f.est)
      body.spentHours = f.spent === '' ? null : Number(f.spent)
    }
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
      <div className="sheet-actions">
        <button className="btn primary" disabled={busy} onClick={save}>Enregistrer</button>
        <button className="btn ghost" onClick={onClose}>Annuler</button>
      </div>
    </Modal>
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
