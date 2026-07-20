import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr, Modal } from '@/lib/ui'
import { PRIORITIES, prioMeta } from '@/lib/priority'
import { formatDue } from '@/lib/dates'
import { MicInput, MicTextarea } from './Mic'
import type { User, PaginatedResponse } from '@/lib/types'
import { LoadMoreButton } from '@/lib/usePagination'
import { Ic } from './Icon'
import { t as tt, trTerm, getLang } from '@/lib/i18n'

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

const fmtDate = (s: string) => { try { return new Date(s).toLocaleDateString(getLang(), { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' } }
const fmtDateTime = (s: string) => { try { return new Date(s).toLocaleString(getLang(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '—' } }
const fmtAgo = (s?: string | null) => {
  if (!s) return tt('ad.never')
  const k = Math.round((Date.now() - new Date(s).getTime()) / 60000)
  if (k < 1) return tt('ad.now'); if (k < 60) return tt('ad.agoMin', { n: k })
  const h = Math.round(k / 60); if (h < 24) return tt('ad.agoH', { n: h })
  const j = Math.round(h / 24); if (j < 30) return tt('ad.agoD', { n: j })
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

const AUDIT_LABEL: Record<string, string> = new Proxy({}, { get: (_o, k) => ({ delete_user: tt('ad.aDelUser'), delete_project: tt('ad.aDelProj'), grant_admin: tt('ad.aGrant'), revoke_admin: tt('ad.aRevoke'), task_priority: tt('ad.aPrio') } as Record<string, string>)[String(k)] }) as Record<string, string>
const AUDIT_ICON: Record<string, string> = {
  delete_user: 'trash', delete_project: 'trash', grant_admin: 'shield', revoke_admin: 'user', task_priority: 'flag',
}

export function Admin({ me }: { me: User }) {
  const [sec, setSec] = useState<Section>('dash')
  const isSuper = !!me.superAdmin
  const segs: [Section, string, string][] = [
    ['dash', 'chart-bar', tt('ad.dash')], ['users', 'user', tt('ad.users')], ['tasks', 'check', tt('ad.tasks')], ['projects', 'folder', tt('ad.projects')],
    ...(isSuper ? [['admins', 'shield', tt('ad.admins')], ['mail', 'inbox', tt('ad.mail')], ['audit', 'list', tt('ad.audit')]] as [Section, string, string][] : []),
  ]
  return (
    <div className="admin-page">
      <div className="viewseg admin-seg">
        {segs.map(([k, ico, l]) => <button key={k} className={sec === k ? 'on' : ''} onClick={() => setSec(k)}><Ic name={ico} s={15} /> {l}</button>)}
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

const TYPE_LBL: Record<string, string> = new Proxy({}, { get: (_o, k) => tt('proj.type' + String(k)[0].toUpperCase() + String(k).slice(1)) }) as Record<string, string>

function Dashboard() {
  const [s, setS] = useState<AStats | null>(null)
  useEffect(() => { api<{ stats: AStats }>('GET', '/admin/stats').then((r) => setS(r.stats)).catch((e: any) => toastErr(e.message)) }, [])
  if (!s) return <div className="empty">{tt('common.loading')}</div>
  const cards: [string, string | number, string, string][] = [
    [tt('ad.users'), s.users, 'user', 'var(--accent)'], [tt('ad.active7'), s.activeUsers7, 'activity', 'var(--ok)'], [tt('ad.projects'), `${s.projectsActive}/${s.projects}`, 'folder', 'var(--blue)'],
    [tt('ad.tasks'), s.tasks, 'check', 'var(--accent)'], [tt('ad.done'), `${s.tasksDone} · ${s.completion}%`, 'target', 'var(--ok)'], [tt('ad.late'), s.tasksOverdue, 'clock', 'var(--danger)'],
  ]
  const donePeak = Math.max(1, ...s.doneByDay.map((d) => d.c))
  return (
    <div className="admin-dash">
      <div className="stat-grid">
        {cards.map(([label, val, ico, color]) => (
          <div key={label} className="stat-card"><div className="stat-ico" style={{ color }}><Ic name={ico} s={20} c={color} /></div><div className="stat-val">{val}</div><div className="stat-lbl">{label}</div></div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card chart-card">
          <div className="chart-h">{tt('ad.byPrio')}</div>
          <VBars data={s.tasksByPriority.map((x) => ({ label: 'P' + x.p, value: x.c, color: PRIO_COLOR[x.p] }))} />
        </div>

        <div className="card chart-card">
          <div className="chart-h">{tt('ad.byType')}</div>
          <VBars data={s.projectsByType.map((x, i) => ({ label: TYPE_LBL[x.t] || x.t, value: x.c, color: ['var(--accent)', 'var(--blue)', 'var(--ok)'][i] }))} />
        </div>

        <div className="card chart-card wide">
          <div className="chart-h">{tt('ad.done14')}</div>
          <div className="spark">
            {s.doneByDay.map((d, i) => (
              <div key={i} className="spark-bar" title={`${d.d} : ${d.c}`}>
                <div className="spark-fill" style={{ height: Math.max(3, Math.round((d.c / donePeak) * 100)) + '%' }} />
              </div>
            ))}
          </div>
          <div className="chart-foot"><span>{s.doneByDay[0]?.d.slice(8)}</span><span>{tt('ad.total')} {s.doneByDay.reduce((a, b) => a + b.c, 0)}</span><span>{tt('ad.today')}</span></div>
        </div>

        <div className="card chart-card wide">
          <div className="chart-h">{tt('ad.lastLogins')}</div>
          {s.recentLogins.length === 0 && <div className="sub">{tt('ad.noLogins')}</div>}
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
      toast(tt('ad.deleted', { n: u.name }) + (r.deletedProjects ? ' ' + tt('ad.plusProjects', { n: r.deletedProjects }) : ''))
      setConfirmId(null); load(1, false)
    } catch (e: any) { toastErr(e.message) }
  }
  async function toggleAdmin(u: AUser) {
    try {
      await api('PATCH', `/admin/users/${u.id}/admin`, { admin: !u.admin })
      toast(u.admin ? tt('ad.roleRevoked', { n: u.name }) : tt('ad.nowAdmin', { n: u.name }))
      load(1, false)
    } catch (e: any) { toastErr(e.message) }
  }

  if (!users) return <div className="empty">{tt('common.loading')}</div>
  let list = users.filter((u) => (u.name + ' ' + u.email).toLowerCase().includes(q.trim().toLowerCase()))
  if (adminsOnly) list = list.filter((u) => u.admin)
  // droit de suppression : pas soi-même, pas le super admin ; un admin normal ne supprime pas d'admins
  const canDelete = (u: AUser) => u.id !== me.id && !u.superAdmin && (isSuper || !u.admin)

  return (
    <>
      <div className="field"><input placeholder={adminsOnly ? tt('ad.searchAdmin') : tt('ad.searchUser')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length}{total > list.length ? ` / ${total}` : ''} {adminsOnly ? tt('ad.adminsCnt') : tt('ad.usersCnt')}</div>
      {adminsOnly && list.length === 0 && <div className="empty">{tt('ad.noAdmins')}</div>}
      {list.map((u) => (
        <div key={u.id} className="admin-card">
          <div className="ac-main">
            <div className="ac-title">
              {u.name}
              {u.superAdmin ? <span className="pill acc" style={{ marginLeft: 6 }}>{tt('ad.superAdmin')}</span>
                : u.admin ? <span className="pill acc" style={{ marginLeft: 6 }}>{tt('ad.admin')}</span> : null}
            </div>
            <div className="sub">{u.email}</div>
            <div className="ac-meta">
              <span><Ic name="trophy" s={13} c="var(--gold)" /> {u.points} pts</span><span><Ic name="folder" s={13} /> {u.projectCount}</span>
              <span><Ic name="check" s={13} c="var(--ok)" /> {u.tasksDone}</span><span><Ic name="clock" s={13} /> {u.tasksOpen}</span><span>{tt('ad.seen')} {fmtAgo(u.lastLogin)}</span><span>{tt('ad.registered')} {fmtDate(u.createdAt)}</span>
            </div>
          </div>
          <div className="ac-actions">
            {isSuper && !u.superAdmin && (
              <button className="btn sm" onClick={() => toggleAdmin(u)}>{u.admin ? tt('ad.revokeAdmin') : tt('ad.makeAdmin')}</button>
            )}
            {canDelete(u) && (confirmId === u.id
              ? <div className="ac-confirm"><button className="btn danger sm" onClick={() => del(u)}>{tt('action.confirm')}</button><button className="btn sm" onClick={() => setConfirmId(null)}>{tt('action.cancel')}</button></div>
              : <button className="btn ghost sm" onClick={() => setConfirmId(u.id)}>{tt('action.delete')}</button>)}
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
      toast(tt('ad.prioSet', { n }))
    } catch (e: any) { toastErr(e.message) }
  }

  if (!tasks) return <div className="empty">{tt('common.loading')}</div>
  const list = tasks.filter((t) => (t.title + ' ' + t.projectName + ' ' + (t.assigneeName || '')).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <div className="privacy-badge"><Ic name="lock" s={13} /> {tt('ad.anon')}</div>
      <div className="field"><input placeholder={tt('ad.searchTask')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length}{total > list.length ? ` / ${total}` : ''} {tt('ad.tasksCnt')}</div>
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
                <span><Ic name="folder" s={13} /> {t.projectName}</span>
                <span>{t.assigneeName ? <><Ic name="user" s={13} /> {t.assigneeName}</> : tt('ad.unassigned')}</span>
                {t.due && <span><Ic name="calendar" s={13} /> {formatDue(t.due)}</span>}
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
    try { await api('DELETE', '/admin/projects/' + p.id); toast(tt('ad.projDeleted', { n: p.name })); setConfirmId(null); load(1, false) }
    catch (e: any) { toastErr(e.message) }
  }

  if (!projects) return <div className="empty">{tt('common.loading')}</div>
  const list = projects.filter((p) => (p.name + ' ' + p.ownerName).toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <div className="privacy-badge"><Ic name="lock" s={13} /> {tt('ad.anon')}</div>
      <div className="field"><input placeholder={tt('ad.searchProject')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grp-h">{list.length}{total > list.length ? ` / ${total}` : ''} {tt('ad.projectsCnt')}</div>
      {list.map((p) => (
        <div key={p.id} className="admin-card">
          <div className="ac-main">
            <div className="ac-title">{p.name}{p.status === 'done' && <span className="pill" style={{ marginLeft: 6 }}>{tt('proj.closed')}</span>}</div>
            <div className="ac-meta"><span><Ic name="user" s={13} c="var(--gold)" /> {p.ownerName}</span><span><Ic name="users" s={13} /> {p.memberCount}</span><span><Ic name="check" s={13} c="var(--ok)" /> {p.doneCount}/{p.taskCount}</span></div>
          </div>
          {confirmId === p.id
            ? <div className="ac-confirm"><button className="btn danger sm" onClick={() => del(p)}>{tt('action.confirm')}</button><button className="btn sm" onClick={() => setConfirmId(null)}>{tt('action.cancel')}</button></div>
            : <button className="btn ghost sm" onClick={() => setConfirmId(p.id)}>{tt('action.delete')}</button>}
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
    if (!f.to.trim() || !f.subject.trim()) { toastErr(tt('ad.needToSubject')); return }
    setBusy(true)
    try { await api('POST', '/admin/mail/send', f); toast(tt('ad.sent')); onSent() }
    catch (e: any) { toastErr(e.message); setBusy(false) }
  }
  return (
    <Modal title={tt('ad.compose')} onClose={onClose}>
      <div className="field"><label>{tt('ad.to')}</label><MicInput value={f.to} onChange={(v) => setF({ ...f, to: v })} placeholder="destinataire@exemple.com" type="email" /></div>
      <div className="field"><label>{tt('ad.subject')}</label><MicInput value={f.subject} onChange={(v) => setF({ ...f, subject: v })} placeholder="Objet du message" /></div>
      <div className="field"><label>{tt('ad.message')}</label><MicTextarea value={f.body} onChange={(v) => setF({ ...f, body: v })} placeholder="Votre message…" rows={7} /></div>
      <div className="sheet-actions"><button className="btn primary" disabled={busy} onClick={send}>{tt('ad.send')}</button><button className="btn ghost" onClick={onClose}>{tt('action.cancel')}</button></div>
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
    try { await api('POST', '/admin/mail/' + open.uid + '/reply', { body: reply }); toast(tt('ad.replySent')); setReply(''); setOpen(null); load() }
    catch (e: any) { toastErr(e.message) } finally { setSending(false) }
  }

  if (err) return (
    <div className="card" style={{ marginTop: 12 }}>
      <p className="sub" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Ic name="inbox" s={15} /> {err}</p>
      <p className="sub" style={{ marginTop: 8 }}>{tt('ad.smtpHint')}</p>
    </div>
  )
  if (!list) return <div className="empty">{tt('common.loading')}</div>

  if (open) return (
    <div>
      <button className="btn-link" onClick={() => setOpen(null)}>{tt('ad.backInbox')}</button>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="title-lg" style={{ fontSize: 16 }}>{open.subject}</div>
        <div className="sub" style={{ marginTop: 4 }}>{tt('ad.from')} {open.from}</div>
        <div className="sub">{tt('ad.on')} {fmtDateTime(open.date)}</div>
        <div className="mail-body">{open.text || htmlToText(open.html) || tt('ad.emptyMsg')}</div>
      </div>
      <div className="section-h">{tt('ad.reply')}</div>
      <div className="card">
        <MicTextarea value={reply} onChange={setReply} placeholder={tt('ad.replyTo') + ' ' + (open.replyTo || open.from) + '…'} rows={6} />
        <button className="btn primary block" style={{ marginTop: 8 }} disabled={sending || !reply.trim()} onClick={sendReply}>{sending ? tt('ad.sending') : tt('ad.sendReply')}</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="sheet-actions" style={{ marginBottom: 10 }}>
        <button className="btn sm" onClick={load}><Ic name="refresh" s={14} /> {tt('ad.refresh')}</button>
        <button className="btn sm primary" onClick={() => setCompose(true)}><Ic name="edit" s={14} /> {tt('ad.write')}</button>
      </div>
      <div className="grp-h">{list.length} {tt('ad.msgsCnt')} — INFO@PLANII.APP</div>
      {list.length === 0 && <div className="empty">{tt('ad.emptyBox')}</div>}
      {list.map((m) => (
        <button key={m.uid} className={'mail-row' + (m.seen ? '' : ' unread')} onClick={() => openMsg(m.uid)}>
          <span className="mail-dot" />
          <div className="mail-main"><div className="mail-from">{m.fromName || m.from}</div><div className="mail-subj">{m.subject}</div></div>
          <span className="mail-date">{fmtDateTime(m.date)}</span>
        </button>
      ))}
      {loadingMsg && <div className="empty">{tt('ad.opening')}</div>}
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
  if (!rows) return <div className="empty">{tt('common.loading')}</div>
  if (!rows.length) return <div className="empty">{tt('ad.noActions')}</div>
  return (
    <>
      <div className="grp-h">{rows.length}{total > rows.length ? ` / ${total}` : ''} {tt('ad.actionsCnt')}</div>
      {rows.map((r) => (
        <div key={r.id} className="admin-card">
          <div className="ac-main">
            <div className="ac-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Ic name={AUDIT_ICON[r.action] || 'activity'} s={14} c="var(--accent)" /> {AUDIT_LABEL[r.action] || r.action}</div>
            <div className="sub">{r.detail}</div>
            <div className="ac-meta"><span><Ic name="user" s={13} /> {r.actor}</span><span>{fmtDateTime(r.at)}</span></div>
          </div>
        </div>
      ))}
      <LoadMoreButton hasMore={hasMore} loading={loadingMore} loaded={rows.length} total={total} onClick={() => load(page + 1, true)} />
    </>
  )
}
