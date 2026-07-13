import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr, Modal } from '@/lib/ui'
import { PRIORITIES, prioMeta } from '@/lib/priority'
import { formatDue } from '@/lib/dates'
import { MicInput, MicTextarea } from './Mic'
import type { User, PaginatedResponse } from '@/lib/types'
import { LoadMoreButton } from '@/lib/usePagination'

type Section = 'dash' | 'users' | 'tasks' | 'projects' | 'admins' | 'audit' | 'mail'

interface AStats {
  users: number; projects: number; projectsActive: number; tasks: number; tasksDone: number; tasksOpen: number; tasksOverdue: number
  completion: number; activeUsers7: number
  tasksByPriority: { p: number; c: number }[]; projectsByType: { t: string; c: number }[]
  doneByDay: { d: string; c: number }[]; recentLogins: { name: string; email: string; lastLogin: string }[]
}
interface AUser { id: string; name: string; email: string; createdAt: string; lastLogin?: string | null; admin: boolean; superAdmin: boolean; projectCount: number; tasksOpen: number; tasksDone: number; points: number }
interface ATask { id: string; title: string; projectId: string; projectName: string; assigneeName: string | null; due: string | null; done: boolean; priority: number }
interface AProject { id: string; name: string; type: string; status: string; ownerName: string; ownerEmail: string; memberCount: number; taskCount: number; doneCount: number }
interface AAudit { id: string; actor: string; action: string; detail: string; at: string }
interface MailItem { uid: number; from: string; fromName: string; subject: string; date: string; seen: boolean }
interface MailMsg { uid: number; from: string; to: string; subject: string; date: string; text: string; html: string; replyTo: string }

const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' } }
const fmtDateTime = (s: string) => { try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '—' } }
const fmtAgo = (s?: string | null) => {
  if (!s) return 'jamais'
  const k = Math.round((Date.now() - new Date(s).getTime()) / 60000)
  if (k < 1) return "à l'instant"; if (k < 60) return `il y a ${k} min`
  const h = Math.round(k / 60); if (h < 24) return `il y a ${h} h`
  const j = Math.round(h / 24); if (j < 30) return `il y a ${j} j`
  return fmtDate(s)
}
const PRIO_COLOR = ['', 'var(--danger)', 'var(--warn)', 'var(--accent)', 'var(--blue)', 'var(--ok)', 'var(--line-strong)']

/** Petit graphique à barres verticales (CSS, thème Planii). */
function VBars({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="vbars">
      {data.map((d, i) => (
        <div className="vbar" key={i} title={`${d.label} : ${d.value}`}>
          <div className="vbar-track"><div className="vbar-fill" style={{ height: Math.round((d.value / max) * 100) + '%', background: d.color || 'var(--accent)' }} /></div>
          <div className="vbar-val">{d.value}</div>
          <div className="vbar-lbl">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

const AUDIT_LABEL: Record<string, string> = {
  delete_user: '🗑 Utilisateur supprimé', delete_project: '🗑 Projet supprimé',
  grant_admin: '⭐ Admin ajouté', revoke_admin: '➖ Admin retiré', task_priority: '⚑ Priorité modifiée',
}

export function Admin({ me }: { me: User }) {
  const [sec, setSec] = useState<Section>('dash')
  const isSuper = !!me.superAdmin
  const segs: [Section, string][] = [
    ['dash', '📊 Tableau de bord'], ['users', '👤 Utilisateurs'], ['tasks', '✓ Tâches'], ['projects', '📁 Projets'],
    ...(isSuper ? [['admins', '⭐ Admins'], ['mail', '📥 Boîte mail'], ['audit', '📜 Audit']] as [Section, string][] : []),
  ]
  return (
    <div className="admin-page">
      <div className="viewseg admin-seg">
        {segs.map(([k, l]) => <button key={k} className={sec === k ? 'on' : ''} onClick={() => setSec(k)}>{l}</button>)}
      </div>
      {sec === 'dash' && <Dashboard />}
      {sec === 'users' && <Users me={me} isSuper={isSuper} adminsOnly={false} />}
      {sec === 'tasks' && <Tasks />}
      {sec === 'projects' && <Projects />}
      {sec === 'admins' && isSuper && <Users me={me} isSuper adminsOnly />}
      {sec === 'mail' && isSuper && <Mailbox />}
      {sec === 'audit' && isSuper && <Audit />}
    </div>
  )
}

const TYPE_LBL: Record<string, string> = { solo: '1-à-1', team: 'Équipe', group: 'Groupe' }

function Dashboard() {
  const [s, setS] = useState<AStats | null>(null)
  useEffect(() => { api<{ stats: AStats }>('GET', '/admin/stats').then((r) => setS(r.stats)).catch((e: any) => toastErr(e.message)) }, [])
  if (!s) return <div className="empty">Chargement…</div>
  const cards: [string, string | number, string][] = [
    ['Utilisateurs', s.users, '👤'], ['Actifs (7 j)', s.activeUsers7, '🟢'], ['Projets', `${s.projectsActive}/${s.projects}`, '📁'],
    ['Tâches', s.tasks, '✓'], ['Terminées', `${s.tasksDone} · ${s.completion}%`, '🎯'], ['En retard', s.tasksOverdue, '⏰'],
  ]
  const donePeak = Math.max(1, ...s.doneByDay.map((d) => d.c))
  return (
    <div className="admin-dash">
      <div className="stat-grid">
        {cards.map(([label, val, ico]) => (
          <div key={label} className="stat-card"><div className="stat-ico">{ico}</div><div className="stat-val">{val}</div><div className="stat-lbl">{label}</div></div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card chart-card">
          <div className="chart-h">Tâches par priorité</div>
          <VBars data={s.tasksByPriority.map((x) => ({ label: 'P' + x.p, value: x.c, color: PRIO_COLOR[x.p] }))} />
        </div>

        <div className="card chart-card">
          <div className="chart-h">Projets par type</div>
          <VBars data={s.projectsByType.map((x, i) => ({ label: TYPE_LBL[x.t] || x.t, value: x.c, color: ['var(--accent)', 'var(--blue)', 'var(--ok)'][i] }))} />
        </div>

        <div className="card chart-card wide">
          <div className="chart-h">Tâches terminées — 14 derniers jours</div>
          <div className="spark">
            {s.doneByDay.map((d, i) => (
              <div key={i} className="spark-bar" title={`${d.d} : ${d.c}`}>
                <div className="spark-fill" style={{ height: Math.max(3, Math.round((d.c / donePeak) * 100)) + '%' }} />
              </div>
            ))}
          </div>
          <div className="chart-foot"><span>{s.doneByDay[0]?.d.slice(8)}</span><span>total {s.doneByDay.reduce((a, b) => a + b.c, 0)}</span><span>auj.</span></div>
        </div>

        <div className="card chart-card wide">
          <div className="chart-h">Dernières connexions</div>
          {s.recentLogins.length === 0 && <div className="sub">Aucune connexion enregistrée pour l’instant.</div>}
          {s.recentLogins.map((u, i) => (
            <div key={i} className="login-row">
              <span className="login-dot" />
              <div className="login-body"><div className="nm">{u.name}</div><div className="sub">{u.email}</div></div>
              <span className="login-ago">{fmtAgo(u.lastLogin)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Users({ me, isSuper, adminsOnly }: { me: User; isSuper: boolean; adminsOnly: boolean }) {
  const [users, setUsers] = useState<AUser[] | null>(null)
  const [q, setQ] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback((pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    api<PaginatedResponse<AUser>>('GET', `/admin/users?page=${pageNum}&limit=30`)
      .then((r) => {
        setUsers((prev) => (append && prev ? [...prev, ...r.items] : r.items))
        setPage(r.page)
        setTotal(r.total)
        setHasMore(r.hasMore)
      })
      .catch((e: any) => toastErr(e.message))
      .finally(() => setLoadingMore(false))
  }, [])
  useEffect(() => { load(1, false) }, [load])

  async function del(u: AUser) {
    try {
      const r = await api<{ deletedProjects: number }>('DELETE', '/admin/users/' + u.id)
      toast(`« ${u.name} » supprimé${r.deletedProjects ? ` (+${r.deletedProjects} projet·s)` : ''}`)
      setConfirmId(null); load(1, false)
    } catch (e: any) { toastErr(e.message) }
  }
  async function toggleAdmin(u: AUser) {
    try {
      await api('PATCH', `/admin/users/${u.id}/admin`, { admin: !u.admin })
      toast(u.admin ? `Rôle admin retiré à « ${u.name} »` : `« ${u.name} » est maintenant admin`)
      load(1, false)
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
      <div className="grp-h">{list.length}{total > list.length ? ` / ${total}` : ''} {adminsOnly ? 'ADMIN·S' : 'UTILISATEUR·S'}</div>
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
              <span>✓ {u.tasksDone}</span><span>⏳ {u.tasksOpen}</span><span>vu·e {fmtAgo(u.lastLogin)}</span><span>inscrit·e {fmtDate(u.createdAt)}</span>
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
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} loaded={users.length} total={total} onClick={() => load(page + 1, true)} />
    </>
  )
}

function Tasks() {
  const [tasks, setTasks] = useState<ATask[] | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const load = useCallback((pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    api<PaginatedResponse<ATask>>('GET', `/admin/tasks?page=${pageNum}&limit=50`)
      .then((r) => {
        setTasks((prev) => (append && prev ? [...prev, ...r.items] : r.items))
        setPage(r.page)
        setTotal(r.total)
        setHasMore(r.hasMore)
      })
      .catch((e: any) => toastErr(e.message))
      .finally(() => setLoadingMore(false))
  }, [])
  useEffect(() => { load(1, false) }, [load])

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
      <div className="privacy-badge"><span>🔒</span> Données client anonymisées</div>
      <div className="field"><input placeholder="Rechercher une tâche…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length}{total > list.length ? ` / ${total}` : ''} TÂCHE·S</div>
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
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} loaded={tasks.length} total={total} onClick={() => load(page + 1, true)} />
    </>
  )
}

function Projects() {
  const [projects, setProjects] = useState<AProject[] | null>(null)
  const [q, setQ] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const load = useCallback((pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    api<PaginatedResponse<AProject>>('GET', `/admin/projects?page=${pageNum}&limit=30`)
      .then((r) => {
        setProjects((prev) => (append && prev ? [...prev, ...r.items] : r.items))
        setPage(r.page)
        setTotal(r.total)
        setHasMore(r.hasMore)
      })
      .catch((e: any) => toastErr(e.message))
      .finally(() => setLoadingMore(false))
  }, [])
  useEffect(() => { load(1, false) }, [load])

  async function del(p: AProject) {
    try { await api('DELETE', '/admin/projects/' + p.id); toast(`Projet « ${p.name} » supprimé`); setConfirmId(null); load(1, false) }
    catch (e: any) { toastErr(e.message) }
  }

  if (!projects) return <div className="empty">Chargement…</div>
  const list = projects.filter((p) => (p.name + ' ' + p.ownerName).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <div className="privacy-badge"><span>🔒</span> Données client anonymisées</div>
      <div className="field"><input placeholder="Rechercher un projet…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length}{total > list.length ? ` / ${total}` : ''} PROJET·S</div>
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
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} loaded={projects.length} total={total} onClick={() => load(page + 1, true)} />
    </>
  )
}

const htmlToText = (h: string) => h.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

function Compose({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [f, setF] = useState({ to: '', subject: '', body: '' })
  const [busy, setBusy] = useState(false)
  async function send() {
    if (!f.to.trim() || !f.subject.trim()) { toastErr('Destinataire et objet requis'); return }
    setBusy(true)
    try { await api('POST', '/admin/mail/send', f); toast('Mail envoyé ✓'); onSent() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title="✏️ Nouveau message" onClose={onClose}>
      <div className="field"><label>À</label><MicInput value={f.to} onChange={(v) => setF({ ...f, to: v })} placeholder="destinataire@exemple.com" type="email" /></div>
      <div className="field"><label>Objet</label><MicInput value={f.subject} onChange={(v) => setF({ ...f, subject: v })} placeholder="Objet du message" /></div>
      <div className="field"><label>Message</label><MicTextarea value={f.body} onChange={(v) => setF({ ...f, body: v })} placeholder="Votre message…" rows={7} /></div>
      <div className="sheet-actions"><button className="btn primary" disabled={busy} onClick={send}>Envoyer</button><button className="btn ghost" onClick={onClose}>Annuler</button></div>
    </Modal>
  )
}

function Mailbox() {
  const [list, setList] = useState<MailItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState<MailMsg | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [compose, setCompose] = useState(false)

  const load = useCallback(() => {
    setErr(null)
    api<{ messages: MailItem[] }>('GET', '/admin/mail').then((r) => setList(r.messages)).catch((e: any) => { setErr(e.message); setList([]) })
  }, [])
  useEffect(() => { load() }, [load])

  async function openMsg(uid: number) {
    setLoadingMsg(true); setReply('')
    try { const r = await api<{ message: MailMsg }>('GET', '/admin/mail/' + uid); setOpen(r.message) }
    catch (e: any) { toastErr(e.message) } finally { setLoadingMsg(false) }
  }
  async function sendReply() {
    if (!open || !reply.trim()) return
    setSending(true)
    try { await api('POST', '/admin/mail/' + open.uid + '/reply', { body: reply }); toast('Réponse envoyée ✓'); setReply(''); setOpen(null); load() }
    catch (e: any) { toastErr(e.message) } finally { setSending(false) }
  }

  if (err) return (
    <div className="card" style={{ marginTop: 12 }}>
      <p className="sub" style={{ margin: 0 }}>📭 {err}</p>
      <p className="sub" style={{ marginTop: 8 }}>Ajoute <code>SMTP_PASS</code> dans le <code>.env</code> du serveur pour activer la boîte mail.</p>
    </div>
  )
  if (!list) return <div className="empty">Chargement…</div>

  if (open) return (
    <div>
      <button className="btn-link" onClick={() => setOpen(null)}>‹ Retour à la boîte</button>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="title-lg" style={{ fontSize: 16 }}>{open.subject}</div>
        <div className="sub" style={{ marginTop: 4 }}>De : {open.from}</div>
        <div className="sub">Le {fmtDateTime(open.date)}</div>
        <div className="mail-body">{open.text || htmlToText(open.html) || '(message vide)'}</div>
      </div>
      <div className="section-h">Répondre</div>
      <div className="card">
        <MicTextarea value={reply} onChange={setReply} placeholder={'Répondre à ' + (open.replyTo || open.from) + '…'} rows={6} />
        <button className="btn primary block" style={{ marginTop: 8 }} disabled={sending || !reply.trim()} onClick={sendReply}>{sending ? 'Envoi…' : 'Envoyer la réponse'}</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="sheet-actions" style={{ marginBottom: 10 }}>
        <button className="btn sm" onClick={load}>↻ Actualiser</button>
        <button className="btn sm primary" onClick={() => setCompose(true)}>✏️ Écrire</button>
      </div>
      <div className="grp-h">{list.length} MESSAGE·S — INFO@PLANII.APP</div>
      {list.length === 0 && <div className="empty">Boîte vide.</div>}
      {list.map((m) => (
        <button key={m.uid} className={'mail-row' + (m.seen ? '' : ' unread')} onClick={() => openMsg(m.uid)}>
          <span className="mail-dot" />
          <div className="mail-main"><div className="mail-from">{m.fromName || m.from}</div><div className="mail-subj">{m.subject}</div></div>
          <span className="mail-date">{fmtDateTime(m.date)}</span>
        </button>
      ))}
      {loadingMsg && <div className="empty">Ouverture…</div>}
      {compose && <Compose onClose={() => setCompose(false)} onSent={() => setCompose(false)} />}
    </div>
  )
}

function Audit() {
  const [rows, setRows] = useState<AAudit[] | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const load = useCallback((pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    api<PaginatedResponse<AAudit> & { audit: AAudit[] }>('GET', `/admin/audit?page=${pageNum}&limit=50`)
      .then((r) => {
        const batch = r.audit || r.items
        setRows((prev) => (append && prev ? [...prev, ...batch] : batch))
        setPage(r.page)
        setTotal(r.total)
        setHasMore(r.hasMore)
      })
      .catch((e: any) => toastErr(e.message))
      .finally(() => setLoadingMore(false))
  }, [])
  useEffect(() => { load(1, false) }, [load])
  if (!rows) return <div className="empty">Chargement…</div>
  if (!rows.length) return <div className="empty">Aucune action enregistrée pour l’instant.</div>
  return (
    <>
      <div className="grp-h">{rows.length}{total > rows.length ? ` / ${total}` : ''} ACTION·S</div>
      {rows.map((r) => (
        <div key={r.id} className="admin-card">
          <div className="ac-main">
            <div className="ac-title">{AUDIT_LABEL[r.action] || r.action}</div>
            <div className="sub">{r.detail}</div>
            <div className="ac-meta"><span>👤 {r.actor}</span><span>{fmtDateTime(r.at)}</span></div>
          </div>
        </div>
      ))}
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} loaded={rows.length} total={total} onClick={() => load(page + 1, true)} />
    </>
  )
}
