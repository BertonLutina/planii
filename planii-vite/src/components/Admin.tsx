import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { PRIORITIES, prioMeta } from '@/lib/priority'
import { formatDue } from '@/lib/dates'
import type { User } from '@/lib/types'

type Section = 'dash' | 'users' | 'tasks' | 'projects' | 'admins' | 'audit'

interface AStats { users: number; projects: number; projectsActive: number; tasks: number; tasksDone: number; tasksOverdue: number; completion: number }
interface AUser { id: string; name: string; email: string; createdAt: string; admin: boolean; superAdmin: boolean; projectCount: number; tasksOpen: number; tasksDone: number; points: number }
interface ATask { id: string; title: string; projectId: string; projectName: string; assigneeName: string | null; due: string | null; done: boolean; priority: number }
interface AProject { id: string; name: string; type: string; status: string; ownerName: string; ownerEmail: string; memberCount: number; taskCount: number; doneCount: number }
interface AAudit { id: string; actor: string; action: string; detail: string; at: string }

const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' } }
const fmtDateTime = (s: string) => { try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '—' } }

const AUDIT_LABEL: Record<string, string> = {
  delete_user: '🗑 Utilisateur supprimé', delete_project: '🗑 Projet supprimé',
  grant_admin: '⭐ Admin ajouté', revoke_admin: '➖ Admin retiré', task_priority: '⚑ Priorité modifiée',
}

export function Admin({ me }: { me: User }) {
  const [sec, setSec] = useState<Section>('dash')
  const isSuper = !!me.superAdmin
  const segs: [Section, string][] = [
    ['dash', '📊 Tableau de bord'], ['users', '👤 Utilisateurs'], ['tasks', '✓ Tâches'], ['projects', '📁 Projets'],
    ...(isSuper ? [['admins', '⭐ Admins'], ['audit', '📜 Audit']] as [Section, string][] : []),
  ]
  return (
    <div>
      <div className="viewseg admin-seg">
        {segs.map(([k, l]) => <button key={k} className={sec === k ? 'on' : ''} onClick={() => setSec(k)}>{l}</button>)}
      </div>
      {sec === 'dash' && <Dashboard />}
      {sec === 'users' && <Users me={me} isSuper={isSuper} adminsOnly={false} />}
      {sec === 'tasks' && <Tasks />}
      {sec === 'projects' && <Projects />}
      {sec === 'admins' && isSuper && <Users me={me} isSuper adminsOnly />}
      {sec === 'audit' && isSuper && <Audit />}
    </div>
  )
}

function Dashboard() {
  const [s, setS] = useState<AStats | null>(null)
  useEffect(() => { api<{ stats: AStats }>('GET', '/admin/stats').then((r) => setS(r.stats)).catch((e: any) => toastErr(e.message)) }, [])
  if (!s) return <div className="empty">Chargement…</div>
  const cards: [string, string | number, string][] = [
    ['Utilisateurs', s.users, '👤'], ['Projets', `${s.projectsActive}/${s.projects}`, '📁'],
    ['Tâches', s.tasks, '✓'], ['Terminées', `${s.tasksDone} · ${s.completion}%`, '🎯'], ['En retard', s.tasksOverdue, '⏰'],
  ]
  return (
    <div className="stat-grid">
      {cards.map(([label, val, ico]) => (
        <div key={label} className="stat-card"><div className="stat-ico">{ico}</div><div className="stat-val">{val}</div><div className="stat-lbl">{label}</div></div>
      ))}
    </div>
  )
}

function Users({ me, isSuper, adminsOnly }: { me: User; isSuper: boolean; adminsOnly: boolean }) {
  const [users, setUsers] = useState<AUser[] | null>(null)
  const [q, setQ] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const load = useCallback(() => { api<{ users: AUser[] }>('GET', '/admin/users').then((r) => setUsers(r.users)).catch((e: any) => toastErr(e.message)) }, [])
  useEffect(() => { load() }, [load])

  async function del(u: AUser) {
    try {
      const r = await api<{ deletedProjects: number }>('DELETE', '/admin/users/' + u.id)
      toast(`« ${u.name} » supprimé${r.deletedProjects ? ` (+${r.deletedProjects} projet·s)` : ''}`)
      setConfirmId(null); load()
    } catch (e: any) { toastErr(e.message) }
  }
  async function toggleAdmin(u: AUser) {
    try {
      await api('PATCH', `/admin/users/${u.id}/admin`, { admin: !u.admin })
      toast(u.admin ? `Rôle admin retiré à « ${u.name} »` : `« ${u.name} » est maintenant admin`)
      load()
    } catch (e: any) { toastErr(e.message) }
  }

  if (!users) return <div className="empty">Chargement…</div>
  let list = users.filter((u) => (u.name + ' ' + u.email).toLowerCase().includes(q.trim().toLowerCase()))
  if (adminsOnly) list = list.filter((u) => u.admin)
  // droit de suppression : pas soi-même, pas le super admin ; un admin normal ne supprime pas d'admins
  const canDelete = (u: AUser) => u.id !== me.id && !u.superAdmin && (isSuper || !u.admin)

  return (
    <>
      <div className="field"><input placeholder={adminsOnly ? 'Rechercher un admin…' : 'Rechercher un utilisateur…'} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length} {adminsOnly ? 'ADMIN·S' : 'UTILISATEUR·S'}</div>
      {adminsOnly && list.length === 0 && <div className="empty">Aucun admin pour l’instant — promeus un utilisateur depuis l’onglet « Utilisateurs ».</div>}
      {list.map((u) => (
        <div key={u.id} className="admin-card">
          <div className="ac-main">
            <div className="ac-title">
              {u.name}
              {u.superAdmin ? <span className="pill acc" style={{ marginLeft: 6 }}>super admin</span>
                : u.admin ? <span className="pill acc" style={{ marginLeft: 6 }}>admin</span> : null}
            </div>
            <div className="sub">{u.email}</div>
            <div className="ac-meta">
              <span>🏆 {u.points} pts</span><span>📁 {u.projectCount}</span>
              <span>✓ {u.tasksDone}</span><span>⏳ {u.tasksOpen}</span><span>inscrit·e {fmtDate(u.createdAt)}</span>
            </div>
          </div>
          <div className="ac-actions">
            {isSuper && !u.superAdmin && (
              <button className="btn sm" onClick={() => toggleAdmin(u)}>{u.admin ? 'Retirer admin' : 'Rendre admin'}</button>
            )}
            {canDelete(u) && (confirmId === u.id
              ? <div className="ac-confirm"><button className="btn danger sm" onClick={() => del(u)}>Confirmer</button><button className="btn sm" onClick={() => setConfirmId(null)}>Annuler</button></div>
              : <button className="btn ghost sm" onClick={() => setConfirmId(u.id)}>Supprimer</button>)}
          </div>
        </div>
      ))}
    </>
  )
}

function Tasks() {
  const [tasks, setTasks] = useState<ATask[] | null>(null)
  const [q, setQ] = useState('')
  const load = useCallback(() => { api<{ tasks: ATask[] }>('GET', '/admin/tasks').then((r) => setTasks(r.tasks)).catch((e: any) => toastErr(e.message)) }, [])
  useEffect(() => { load() }, [load])

  async function setPrio(t: ATask, n: number) {
    try {
      await api('PATCH', `/admin/tasks/${t.id}/priority`, { priority: n })
      setTasks((l) => (l || []).map((x) => x.id === t.id ? { ...x, priority: n } : x))
      toast(`Priorité → P${n}`)
    } catch (e: any) { toastErr(e.message) }
  }

  if (!tasks) return <div className="empty">Chargement…</div>
  const list = tasks.filter((t) => (t.title + ' ' + t.projectName + ' ' + (t.assigneeName || '')).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <div className="field"><input placeholder="Rechercher une tâche…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length} TÂCHE·S</div>
      {list.map((t) => {
        const pm = prioMeta(t.priority)
        return (
          <div key={t.id} className="admin-card">
            <div className="ac-main">
              <div className="ac-title">
                <span className={'pflag ' + pm.flagCls} style={{ marginRight: 6 }}>{pm.tag}</span>
                <span style={t.done ? { textDecoration: 'line-through', color: 'var(--hint)' } : undefined}>{t.title}</span>
              </div>
              <div className="ac-meta">
                <span>📁 {t.projectName}</span>
                <span>{t.assigneeName ? '👤 ' + t.assigneeName : '— non assignée'}</span>
                {t.due && <span>📅 {formatDue(t.due)}</span>}
              </div>
            </div>
            <div className="prio-pick sm">
              {PRIORITIES.map((n) => <button key={n} className={t.priority === n ? 'on o' + n : ''} onClick={() => setPrio(t, n)}>P{n}</button>)}
            </div>
          </div>
        )
      })}
    </>
  )
}

function Projects() {
  const [projects, setProjects] = useState<AProject[] | null>(null)
  const [q, setQ] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const load = useCallback(() => { api<{ projects: AProject[] }>('GET', '/admin/projects').then((r) => setProjects(r.projects)).catch((e: any) => toastErr(e.message)) }, [])
  useEffect(() => { load() }, [load])

  async function del(p: AProject) {
    try { await api('DELETE', '/admin/projects/' + p.id); toast(`Projet « ${p.name} » supprimé`); setConfirmId(null); load() }
    catch (e: any) { toastErr(e.message) }
  }

  if (!projects) return <div className="empty">Chargement…</div>
  const list = projects.filter((p) => (p.name + ' ' + p.ownerName).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <div className="field"><input placeholder="Rechercher un projet…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length} PROJET·S</div>
      {list.map((p) => (
        <div key={p.id} className="admin-card">
          <div className="ac-main">
            <div className="ac-title">{p.name}{p.status === 'done' && <span className="pill" style={{ marginLeft: 6 }}>clôturé</span>}</div>
            <div className="ac-meta"><span>👑 {p.ownerName}</span><span>👥 {p.memberCount}</span><span>✓ {p.doneCount}/{p.taskCount}</span></div>
          </div>
          {confirmId === p.id
            ? <div className="ac-confirm"><button className="btn danger sm" onClick={() => del(p)}>Confirmer</button><button className="btn sm" onClick={() => setConfirmId(null)}>Annuler</button></div>
            : <button className="btn ghost sm" onClick={() => setConfirmId(p.id)}>Supprimer</button>}
        </div>
      ))}
    </>
  )
}

function Audit() {
  const [rows, setRows] = useState<AAudit[] | null>(null)
  useEffect(() => { api<{ audit: AAudit[] }>('GET', '/admin/audit').then((r) => setRows(r.audit)).catch((e: any) => toastErr(e.message)) }, [])
  if (!rows) return <div className="empty">Chargement…</div>
  if (!rows.length) return <div className="empty">Aucune action enregistrée pour l’instant.</div>
  return (
    <>
      <div className="grp-h">{rows.length} ACTION·S (100 dernières)</div>
      {rows.map((r) => (
        <div key={r.id} className="admin-card">
          <div className="ac-main">
            <div className="ac-title">{AUDIT_LABEL[r.action] || r.action}</div>
            <div className="sub">{r.detail}</div>
            <div className="ac-meta"><span>👤 {r.actor}</span><span>{fmtDateTime(r.at)}</span></div>
          </div>
        </div>
      ))}
    </>
  )
}
