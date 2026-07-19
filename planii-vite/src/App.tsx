import { useEffect, useState } from 'react'
import { api, getTok, setTok } from '@/lib/api'
import { Toaster, Avatar, health, toast, toastErr, Modal } from '@/lib/ui'
import type { ProjectLabel, User } from '@/lib/types'
import { taskTypesOf, roleLibraryOf, typeTone } from '@/lib/tasktype'
import { MicInput } from './components/Mic'
import { Ic } from './components/Icon'
import { Auth } from './components/Auth'
import { ProjectsList, JoinModal } from './components/Projects'
import { ProjectDetail } from './components/ProjectDetail'
import { CalendarView } from './components/Calendar'
import { Home } from './components/Home'
import { Leaderboard } from './components/Leaderboard'
import { NotifBell } from './components/Notifications'
import { CommandPalette, CMD_LABEL } from './components/CommandPalette'
import { QuickTask } from './components/QuickTask'
import { QuickAppointment } from './components/QuickAppointment'
import { HelpButton } from './components/Guide'
import { useI18n, LangPicker } from '@/lib/i18n'
import { Admin } from './components/Admin'
import { StyleGuide } from './components/StyleGuide'
import { Privacy } from './components/Privacy'
import { applyTheme, getTheme, type Theme } from '@/lib/theme'
import { useProjectSummaries } from '@/lib/useProjects'
import { connectRealtime, disconnectRealtime } from '@/lib/realtime'

function ThemeControl() {
  const { t: tr } = useI18n()
  const [t, setT] = useState<Theme>(getTheme())
  const opts: [Theme, string, string][] = [['light', 'sun', tr('theme.light')], ['dark', 'moon', tr('theme.dark')], ['auto', 'monitor', tr('theme.auto')]]
  return (
    <>
      <div className="section-h">{tr('theme.title')}</div>
      <div className="theme-seg">
        {opts.map(([v, icon, label]) => (
          <button key={v} className={t === v ? 'on' : ''} onClick={() => { setT(v); applyTheme(v) }}>
            <span className="ti"><Ic name={icon} s={18} /></span>{label}
          </button>
        ))}
      </div>
    </>
  )
}

function ThemeToggleButton() {
  const [t, setT] = useState<Theme>(getTheme())
  const dark = t === 'dark'
  const next = dark ? 'light' : 'dark'
  return (
    <button className="theme-icon-btn" aria-label="Thème" title="Thème" onClick={() => { setT(next); applyTheme(next) }}>
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  )
}

type ListEditorProps = {
  me: User; onUpdate: (u: User) => void; title: string; desc: string
  field: 'taskTypes' | 'roleLibrary'; get: (u: User) => string[]
  placeholder: string; maxLen: number; emptyNote: string
}

function ListEditModal({ me, onUpdate, title, field, get, placeholder, maxLen, emptyNote, onClose }: ListEditorProps & { onClose: () => void }) {
  const [list, setList] = useState<string[]>(get(me))
  const [nv, setNv] = useState('')
  const [saving, setSaving] = useState(false)

  function add() {
    const v = nv.trim()
    if (!v) return
    if (list.some((t) => t.toLowerCase() === v.toLowerCase())) { toastErr('Déjà dans la liste'); return }
    if (list.length >= 40) { toastErr('Liste trop longue'); return }
    setList([...list, v]); setNv('')
  }
  const remove = (t: string) => setList(list.filter((x) => x !== t))

  async function save() {
    setSaving(true)
    try {
      const r = await api<{ user: User }>('PATCH', '/me', { [field]: list })
      onUpdate(r.user); toast('Enregistré ✓'); onClose()
    } catch (e: any) { toastErr(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="chips">
        {list.map((t) => (
          <span key={t} className={'chip ' + typeTone(t)}>
            {t}
            <button className="chip-x" onClick={() => remove(t)} aria-label={'Retirer ' + t}>×</button>
          </span>
        ))}
        {list.length === 0 && <span className="sub">{emptyNote}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <MicInput style={{ flex: 1 }} value={nv} maxLength={maxLen} placeholder={placeholder} onChange={setNv} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
        <button className="btn sm" onClick={add}>Ajouter</button>
      </div>
      <div className="sheet-actions">
        <button className="btn primary" disabled={saving} onClick={save}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button className="btn ghost" onClick={onClose}>Annuler</button>
      </div>
    </Modal>
  )
}

function ListEditor(props: ListEditorProps) {
  const [editing, setEditing] = useState(false)
  const saved = props.get(props.me)
  return (
    <>
      <div className="section-h">{props.title}</div>
      <div className="card info-card">
        <button className="info-edit" onClick={() => setEditing(true)} aria-label={'Modifier ' + props.title}><Ic name="edit" s={15} /> Modifier</button>
        <p className="sub" style={{ marginTop: 0, paddingRight: 96 }}>{props.desc}</p>
        <div className="chips">
          {saved.map((t) => <span key={t} className={'chip ' + typeTone(t)}>{t}</span>)}
          {saved.length === 0 && <span className="sub">{props.emptyNote}</span>}
        </div>
      </div>
      {editing && <ListEditModal {...props} onClose={() => setEditing(false)} />}
    </>
  )
}

const LABEL_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']

function ProjectLabelEditor() {
  const [labels, setLabels] = useState<ProjectLabel[]>([])
  const [palette, setPalette] = useState<string[]>(LABEL_COLORS)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])
  const [busy, setBusy] = useState(false)

  const load = () => api<{ labels: ProjectLabel[]; colors?: string[] }>('GET', '/project-labels')
    .then((r) => {
      setLabels(r.labels)
      const colors = r.colors && r.colors.length ? r.colors : LABEL_COLORS
      setPalette(colors)
      if (!colors.some((c) => c.toLowerCase() === color.toLowerCase())) setColor(colors[0] || LABEL_COLORS[0])
    })
    .catch((e: any) => toastErr(e.message))
  useEffect(() => { load() }, [])

  async function addPaletteColor(next: string) {
    setColor(next)
    if (palette.some((c) => c.toLowerCase() === next.toLowerCase())) return
    try {
      const r = await api<{ colors: string[] }>('PATCH', '/project-label-colors', { color: next })
      setPalette(r.colors)
    } catch (e: any) { toastErr(e.message) }
  }

  async function removePaletteColor(c: string) {
    try {
      const r = await api<{ colors: string[] }>('DELETE', '/project-label-colors/' + encodeURIComponent(c.replace('#', '')))
      setPalette(r.colors)
      if (color.toLowerCase() === c.toLowerCase()) setColor(r.colors[0] || LABEL_COLORS[0])
    } catch (e: any) { toastErr(e.message) }
  }

  async function add() {
    const label = name.trim()
    if (!label) return
    setBusy(true)
    try {
      await api('POST', '/project-labels', { label, color })
      setName('')
      setColor(palette[(labels.length + 1) % palette.length] || LABEL_COLORS[0])
      await load()
      toast('Libellé ajouté ✓')
    } catch (e: any) { toastErr(e.message) } finally { setBusy(false) }
  }

  async function remove(id: string) {
    try {
      await api('DELETE', '/project-labels/' + id)
      await load()
      toast('Libellé supprimé')
    } catch (e: any) { toastErr(e.message) }
  }

  const [editing, setEditing] = useState(false)
  return (
    <>
      <div className="section-h">Mes libellés de projets</div>
      <div className="card info-card">
        <button className="info-edit" onClick={() => setEditing(true)} aria-label="Modifier mes libellés"><Ic name="edit" s={15} /> Modifier</button>
        <p className="sub" style={{ marginTop: 0, paddingRight: 96 }}>Ces libellés colorent tes projets et apparaissent dans la légende.</p>
        <div className="label-chip-list">
          {labels.map((l) => (
            <span key={l.id} className="label-chip" style={{ borderColor: l.color, color: l.color }}>
              <i style={{ background: l.color }} />{l.label}
            </span>
          ))}
          {labels.length === 0 && <span className="sub">Aucun libellé pour l’instant.</span>}
        </div>
      </div>
      {editing && (
        <Modal title="Modifier mes libellés" onClose={() => setEditing(false)}>
          <p className="sub" style={{ marginTop: 0 }}>Ces libellés colorent tes projets et apparaissent dans la légende.</p>
          <div className="label-chip-list">
            {labels.map((l) => (
              <span key={l.id} className="label-chip" style={{ borderColor: l.color, color: l.color }}>
                <i style={{ background: l.color }} />{l.label}
                {!l.fixed && <button className="chip-x" onClick={() => remove(l.id)} aria-label={'Retirer ' + l.label}>×</button>}
              </span>
            ))}
          </div>
          <div className="label-add-row">
            <MicInput value={name} maxLength={28} placeholder="Nouveau libellé…" onChange={setName} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
            <div className="label-color-pick" aria-label="Couleur du libellé">
              {palette.map((c) => {
                const custom = !LABEL_COLORS.some((d) => d.toLowerCase() === c.toLowerCase())
                return (
                  <span key={c} className="label-color-wrap">
                    <button className={color === c ? 'on' : ''} style={{ background: c }} onClick={() => setColor(c)} aria-label={'Couleur ' + c} />
                    {custom && <button className="label-color-x" onClick={() => removePaletteColor(c)} aria-label={'Supprimer la couleur ' + c}>×</button>}
                  </span>
                )
              })}
              <label className="label-color-custom" title="Choisir une couleur">
                <input type="color" value={color} onChange={(e) => addPaletteColor(e.target.value)} />
                <span>＋</span>
              </label>
            </div>
            <button className="btn sm" disabled={busy} onClick={add}>Ajouter</button>
          </div>
          <div className="sheet-actions">
            <button className="btn primary" onClick={() => setEditing(false)}>Terminé</button>
          </div>
        </Modal>
      )}
    </>
  )
}

function EditInfoModal({ me, onClose, onUpdate }: { me: User; onClose: () => void; onUpdate: (u: User) => void }) {
  const { t: tr } = useI18n()
  const [first, setFirst] = useState(me.firstName || '')
  const [last, setLast] = useState(me.lastName || '')
  const [job, setJob] = useState(me.job || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!first.trim() && !last.trim()) { toastErr('Indique au moins un prénom ou un nom'); return }
    setSaving(true)
    try {
      const r = await api<{ user: User }>('PATCH', '/me', { firstName: first.trim(), lastName: last.trim(), job: job.trim() })
      onUpdate(r.user)
      toast('Profil mis à jour ✓')
      onClose()
    } catch (e: any) { toastErr(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal title={tr('profile.editInfo')} onClose={onClose}>
      <div className="field"><label>{tr('profile.firstName')}</label>
        <MicInput value={first} onChange={setFirst} placeholder="Ton prénom" maxLength={60} autoFocus /></div>
      <div className="field"><label>{tr('profile.lastName')}</label>
        <MicInput value={last} onChange={setLast} placeholder="Ton nom" maxLength={60} /></div>
      <div className="field"><label>{tr('profile.job')}</label>
        <MicInput value={job} onChange={setJob} placeholder="Ex. Développeur, Consultant…" maxLength={60} /></div>
      <div className="sheet-actions">
        <button className="btn primary" disabled={saving} onClick={save}>{saving ? tr('action.saving') : tr('action.save')}</button>
        <button className="btn ghost" onClick={onClose}>{tr('action.cancel')}</button>
      </div>
    </Modal>
  )
}

function Profile({ me, onLogout, onUpdate, onAdmin }: { me: User; onLogout: () => void; onUpdate: (u: User) => void; onAdmin: () => void }) {
  const { t: tr } = useI18n()
  const [editInfo, setEditInfo] = useState(false)

  return (
    <div className="settings-page profile-page">
      <div className="card profile-hero">
        <div className="who" style={{ gap: 12 }}>
          <Avatar name={me.name} size={48} />
          <div><p className="title-lg" style={{ fontSize: 16 }}>{me.name}</p><p className="sub">{me.email}{me.job ? ' · ' + me.job : ''}</p></div>
        </div>
        <button className="btn ghost sm profile-logout" onClick={onLogout}><Ic name="logout" s={15} /> {tr('profile.logout')}</button>
      </div>

      <div className="profile-grid">
        <div className="profile-col">
          <div className="section-h">{tr('profile.info')}</div>
          <div className="card info-card">
            <button className="info-edit" onClick={() => setEditInfo(true)} aria-label={tr('profile.editInfo')}>
              <Ic name="edit" s={15} /> {tr('action.edit')}
            </button>
            <div className="info-rows">
              <div className="info-row"><span className="info-k">{tr('profile.firstName')}</span><span className="info-v">{me.firstName || '—'}</span></div>
              <div className="info-row"><span className="info-k">{tr('profile.lastName')}</span><span className="info-v">{me.lastName || '—'}</span></div>
              <div className="info-row"><span className="info-k">{tr('profile.job')}</span><span className="info-v">{me.job || '—'}</span></div>
              <div className="info-row"><span className="info-k">{tr('profile.email')}</span><span className="info-v">{me.email}</span></div>
            </div>
          </div>
          {editInfo && <EditInfoModal me={me} onClose={() => setEditInfo(false)} onUpdate={onUpdate} />}

          <ListEditor me={me} onUpdate={onUpdate}
            title={tr('profile.roles')} field="roleLibrary" get={roleLibraryOf}
            desc="Bibliothèque de rôles réutilisables dans tes projets (ex. Chef de projet, Développeur, Consultant)."
            placeholder="Nouveau rôle…" maxLen={40}
            emptyNote="Aucun rôle — ajoutes-en pour les réutiliser dans tes projets." />
        </div>

        <div className="profile-col">
          <ProjectLabelEditor />

          <ListEditor me={me} onUpdate={onUpdate}
            title={tr('profile.taskTypes')} field="taskTypes" get={taskTypesOf}
            desc="Ces types s’appliquent à toutes tes tâches (ex. Tâche, Bug, Amélioration…)."
            placeholder="Nouveau type…" maxLen={30}
            emptyNote="Aucun type — les défauts (Tâche, Bug) seront utilisés." />

          <div className="profile-actions">
            {me.admin && (
              <button className="btn primary block" style={{ marginTop: 4 }} onClick={onAdmin}><Ic name="shield" s={16} /> {tr('profile.adminSpace')}</button>
            )}
            <ThemeControl />
            <div className="section-h" style={{ marginTop: 18 }}>{tr('lang.title')}</div>
            <LangPicker />
          </div>
        </div>
      </div>
    </div>
  )
}

type TabKey = 'accueil' | 'projets' | 'calendrier' | 'classement' | 'profil' | 'admin'
const I = {
  accueil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>,
  projets: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg>,
  calendrier: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  classement: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3" /></svg>,
  profil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
}
const NAV: [TabKey, string][] = [['accueil', 'Accueil'], ['projets', 'Projets'], ['calendrier', 'Agenda'], ['classement', 'Classement'], ['profil', 'Profil']]
const ADMIN_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9.5 12l1.8 1.8L15 10" /></svg>

function Shell({ me, onLogout, onUpdate }: { me: User; onLogout: () => void; onUpdate: (u: User) => void }) {
  const [tab, setTab] = useState<TabKey>('accueil')
  const [openId, setOpenId] = useState<string | null>(null)
  const [joinOpen, setJoinOpen] = useState<boolean | string>(false)
  const [newSignal, setNewSignal] = useState(0)
  const [cmd, setCmd] = useState(false)
  const [quick, setQuick] = useState(false)
  const [quickAppt, setQuickAppt] = useState(false)
  const [agendaPick, setAgendaPick] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [homeView, setHomeView] = useState<'list' | 'board' | 'agenda'>('list')
  const { projects } = useProjectSummaries()
  const newProject = () => { setTab('projets'); setNewSignal((s) => s + 1) }

  useEffect(() => {
    const u = new URL(location.href)
    let tok = u.searchParams.get('invite')
    const m = u.pathname.match(/\/invite\/([^/]+)/); if (m) tok = m[1]
    if (tok) setJoinOpen(tok)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((o) => !o) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (openId) return <ProjectDetail id={openId} me={me} onBack={() => setOpenId(null)} />

  const { t: tr } = useI18n()
  const TITLES: Record<TabKey, string> = { accueil: tr('title.home'), projets: tr('title.projects'), calendrier: tr('title.agenda'), classement: tr('title.leaderboard'), profil: tr('title.profile'), admin: tr('title.admin') }
  const MOBILE_TITLES: Record<TabKey, string> = { accueil: tr('nav.home'), projets: tr('nav.projects'), calendrier: tr('nav.agenda'), classement: tr('nav.leaderboard'), profil: tr('nav.profile'), admin: tr('nav.admin') }
  const NAVL: Record<TabKey, string> = MOBILE_TITLES
  const title = TITLES[tab]
  const HV: [typeof homeView, string, string][] = [['list', 'list', tr('view.list')], ['board', 'board', tr('view.board')], ['agenda', 'calendar-days', tr('view.agenda')]]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="side-brand"><span className="logo"><b /></span><span>Planii</span></div>
        <button className="side-search" onClick={() => setCmd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span>{tr('action.search')}</span><span className="kbd">{CMD_LABEL}</span>
        </button>
        <nav className="side-nav">
          {me.admin && (
            <button className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>{ADMIN_ICON}<span>{NAVL.admin}</span></button>
          )}
          {NAV.map(([k]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{I[k]}<span>{NAVL[k]}</span></button>
          ))}
        </nav>
        <div className="side-label">{tr('nav.projects').toUpperCase()}</div>
        <div className="side-projects">
          {(projects || []).filter((p) => p.status !== 'done').slice(0, 5).map((p, index) => {
            const h = health(p.taskCount, p.doneCount, p.status)
            return (
              <button key={p.id} className="side-project" onClick={() => setOpenId(p.id)} title={`${h.done}/${h.total} tâches`}>
                <span className={'side-dot d' + (index % 5)} />
                <span>{p.name}</span>
              </button>
            )
          })}
        </div>
        <div className="side-foot"><Avatar name={me.name} /><span className="nm">{me.name}</span><ThemeToggleButton /></div>
      </aside>

      <main className="shell-main">
        <header className="appbar">
          <div className="appbar-title"><span className="desktop-title">{title}</span><span className="mobile-title">{MOBILE_TITLES[tab]}</span></div>
          <div className="appbar-right">
            {tab === 'accueil' && (
              <div className="appbar-views">
                {HV.map(([v, icon, l]) => <button key={v} className={homeView === v ? 'on' : ''} onClick={() => setHomeView(v)}><Ic name={icon} s={15} />{l}</button>)}
              </div>
            )}
            {(tab === 'accueil' || tab === 'projets') && (
              <button className="newbtn" onClick={tab === 'accueil' ? () => setQuick(true) : newProject}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>{tr('action.new')}
              </button>
            )}
            <HelpButton tab={tab} />
            <span className="mobile-pill"><ThemeToggleButton /><NotifBell /></span>
            <Avatar name={me.name} />
          </div>
        </header>
        <div className="wrap">
          {tab === 'accueil' && <Home me={me} onOpen={setOpenId} refreshKey={refresh} view={homeView} setView={setHomeView} />}
          {tab === 'projets' && <ProjectsList onOpen={setOpenId} onJoin={() => setJoinOpen(true)} openSignal={newSignal} onOpenSignalConsumed={() => setNewSignal(0)} />}
          {tab === 'calendrier' && <CalendarView onOpen={setOpenId} />}
          {tab === 'classement' && <Leaderboard onOpen={setOpenId} />}
          {tab === 'profil' && <Profile me={me} onLogout={onLogout} onUpdate={onUpdate} onAdmin={() => setTab('admin')} />}
          {tab === 'admin' && me.admin && <Admin me={me} />}
        </div>
      </main>

      <nav className="bottomnav">
        {NAV.map(([k]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><span className="bic">{I[k]}</span>{NAVL[k]}</button>
        ))}
      </nav>
      <button
        className="fab"
        aria-label={tab === 'calendrier' ? 'Créer un rendez-vous ou une tâche' : 'Nouveau projet'}
        title={tab === 'calendrier' ? 'Créer un rendez-vous ou une tâche' : 'Nouveau projet'}
        onClick={() => { if (tab === 'calendrier') setAgendaPick(true); else newProject() }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>

      <CommandPalette open={cmd} onClose={() => setCmd(false)} setTab={setTab} openProject={setOpenId} newProject={newProject} />
      {quick && <QuickTask me={me} onClose={() => setQuick(false)} onCreated={() => { setQuick(false); setRefresh((k) => k + 1) }} />}
      {quickAppt && <QuickAppointment onClose={() => setQuickAppt(false)} onCreated={() => { setQuickAppt(false); setRefresh((k) => k + 1) }} />}
      {agendaPick && (
        <Modal title={tr('qa.pick')} onClose={() => setAgendaPick(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn block" style={{ justifyContent: 'flex-start', gap: 10, padding: '14px 16px' }} onClick={() => { setAgendaPick(false); setQuickAppt(true) }}>
              <Ic name="calendar" s={18} c="var(--accent)" /> {tr('qa.appt')}
            </button>
            <button className="btn block" style={{ justifyContent: 'flex-start', gap: 10, padding: '14px 16px' }} onClick={() => { setAgendaPick(false); setQuick(true) }}>
              <Ic name="check" s={18} c="var(--ok)" /> {tr('qa.task')}
            </button>
          </div>
        </Modal>
      )}

      {joinOpen && (
        <JoinModal
          token={typeof joinOpen === 'string' ? joinOpen : ''}
          onClose={() => setJoinOpen(false)}
          onJoined={(pid) => { setJoinOpen(false); setOpenId(pid) }}
        />
      )}
    </div>
  )
}

const isStyleGuideRoute = () => {
  const path = window.location.pathname.replace(/\/+$/, '')
  const hash = window.location.hash.replace(/^#\/?/, '')
  return path === '/style-guide' || path.endsWith('/style-guide') || hash === 'style-guide'
}

const isPrivacyRoute = () => {
  const path = window.location.pathname.replace(/\/+$/, '')
  const hash = window.location.hash.replace(/^#\/?/, '')
  const names = ['/confidentialite', '/confidentialité', '/privacy', '/privacy-policy']
  return names.some((n) => path === n || path.endsWith(n)) || hash === 'confidentialite' || hash === 'privacy'
}

export default function App() {
  const styleGuide = isStyleGuideRoute()
  const privacy = isPrivacyRoute()
  const [me, setMe] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    if (styleGuide || privacy) return
    if (!getTok()) { setMe(null); return }
    api<{ user: User }>('GET', '/me').then((r) => { setMe(r.user); connectRealtime() }).catch(() => { setTok(null); setMe(null) })
    return () => disconnectRealtime()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onLogout = () => { disconnectRealtime(); setTok(null); setMe(null) }
  if (styleGuide) return <StyleGuide />
  if (privacy) return <Privacy />
  return (
    <>
      <Toaster />
      {me === undefined ? <div className="boot">Connexion…</div>
        : me ? <Shell me={me} onLogout={onLogout} onUpdate={setMe} />
        : <Auth onAuth={(u) => { setMe(u); connectRealtime() }} />}
    </>
  )
}
