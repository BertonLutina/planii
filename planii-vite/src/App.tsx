import { useEffect, useState } from 'react'
import { api, getTok, setTok } from '@/lib/api'
import { Toaster, Avatar, health, toast, toastErr } from '@/lib/ui'
import type { User } from '@/lib/types'
import { taskTypesOf, roleLibraryOf, typeTone } from '@/lib/tasktype'
import { MicInput } from './components/Mic'
import { Auth } from './components/Auth'
import { ProjectsList, JoinModal } from './components/Projects'
import { ProjectDetail } from './components/ProjectDetail'
import { CalendarView } from './components/Calendar'
import { Home } from './components/Home'
import { Leaderboard } from './components/Leaderboard'
import { NotifBell } from './components/Notifications'
import { CommandPalette, CMD_LABEL } from './components/CommandPalette'
import { QuickTask } from './components/QuickTask'
import { Admin } from './components/Admin'
import { applyTheme, getTheme, type Theme } from '@/lib/theme'
import { useAllProjects } from '@/lib/useProjects'
import { connectRealtime, disconnectRealtime } from '@/lib/realtime'

function ThemeControl() {
  const [t, setT] = useState<Theme>(getTheme())
  const opts: [Theme, string, string][] = [['light', '☀️', 'Clair'], ['dark', '🌙', 'Sombre'], ['auto', '🖥️', 'Auto']]
  return (
    <>
      <div className="section-h">Apparence</div>
      <div className="theme-seg">
        {opts.map(([v, icon, label]) => (
          <button key={v} className={t === v ? 'on' : ''} onClick={() => { setT(v); applyTheme(v) }}>
            <span className="ti">{icon}</span>{label}
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

function ListEditor({ me, onUpdate, title, desc, field, get, placeholder, maxLen, emptyNote }: {
  me: User; onUpdate: (u: User) => void; title: string; desc: string
  field: 'taskTypes' | 'roleLibrary'; get: (u: User) => string[]
  placeholder: string; maxLen: number; emptyNote: string
}) {
  const [list, setList] = useState<string[]>(get(me))
  const [nv, setNv] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(list) !== JSON.stringify(get(me))

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
      onUpdate(r.user); setList(get(r.user)); toast('Enregistré ✓')
    } catch (e: any) { toastErr(e.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="section-h">{title}</div>
      <div className="card">
        <p className="sub" style={{ marginTop: 0 }}>{desc}</p>
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
        <button className="btn primary block" style={{ marginTop: 10 }} disabled={!dirty || saving} onClick={save}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </>
  )
}

function Profile({ me, onLogout, onUpdate, onAdmin }: { me: User; onLogout: () => void; onUpdate: (u: User) => void; onAdmin: () => void }) {
  const [first, setFirst] = useState(me.firstName || '')
  const [last, setLast] = useState(me.lastName || '')
  const [job, setJob] = useState(me.job || '')
  const [saving, setSaving] = useState(false)
  const dirty = first !== (me.firstName || '') || last !== (me.lastName || '') || job !== (me.job || '')

  async function save() {
    if (!first.trim() && !last.trim()) { toastErr('Indique au moins un prénom ou un nom'); return }
    setSaving(true)
    try {
      const r = await api<{ user: User }>('PATCH', '/me', { firstName: first.trim(), lastName: last.trim(), job: job.trim() })
      onUpdate(r.user)
      toast('Profil mis à jour ✓')
    } catch (e: any) { toastErr(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="settings-page">
      <div className="card">
        <div className="who" style={{ gap: 12 }}>
          <Avatar name={me.name} size={48} />
          <div><p className="title-lg" style={{ fontSize: 16 }}>{me.name}</p><p className="sub">{me.email}{me.job ? ' · ' + me.job : ''}</p></div>
        </div>
      </div>

      <div className="section-h">Mes informations</div>
      <div className="card">
        <div className="field"><label>Prénom</label>
          <MicInput value={first} onChange={setFirst} placeholder="Ton prénom" maxLength={60} /></div>
        <div className="field"><label>Nom</label>
          <MicInput value={last} onChange={setLast} placeholder="Ton nom" maxLength={60} /></div>
        <div className="field"><label>Métier</label>
          <MicInput value={job} onChange={setJob} placeholder="Ex. Développeur, Consultant…" maxLength={60} /></div>
        <button className="btn primary block" style={{ marginTop: 6 }} disabled={!dirty || saving} onClick={save}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      <ListEditor me={me} onUpdate={onUpdate}
        title="Mes rôles" field="roleLibrary" get={roleLibraryOf}
        desc="Bibliothèque de rôles réutilisables dans tes projets (ex. Chef de projet, Développeur, Consultant)."
        placeholder="Nouveau rôle…" maxLen={40}
        emptyNote="Aucun rôle — ajoutes-en pour les réutiliser dans tes projets." />

      <ListEditor me={me} onUpdate={onUpdate}
        title="Mes types de tâches" field="taskTypes" get={taskTypesOf}
        desc="Ces types s’appliquent à toutes tes tâches (ex. Tâche, Bug, Amélioration…)."
        placeholder="Nouveau type…" maxLen={30}
        emptyNote="Aucun type — les défauts (Tâche, Bug) seront utilisés." />

      {me.admin && (
        <button className="btn primary block" style={{ marginTop: 4 }} onClick={onAdmin}>🛡️ Espace admin</button>
      )}
      <ThemeControl />
      <button className="btn danger block" style={{ marginTop: 16 }} onClick={onLogout}>Se déconnecter</button>
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
  const [refresh, setRefresh] = useState(0)
  const [homeView, setHomeView] = useState<'list' | 'board' | 'agenda'>('list')
  const { projects } = useAllProjects()
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

  const TITLES: Record<TabKey, string> = { accueil: 'Accueil — mes tâches', projets: 'Projets', calendrier: 'Agenda', classement: 'Classement', profil: 'Profil', admin: 'Espace admin' }
  const MOBILE_TITLES: Record<TabKey, string> = { accueil: 'Accueil', projets: 'Projets', calendrier: 'Agenda', classement: 'Classement', profil: 'Profil', admin: 'Admin' }
  const title = TITLES[tab]
  const HV: [typeof homeView, string][] = [['list', '☰ Liste'], ['board', '▦ Tableau'], ['agenda', '📅 Agenda']]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="side-brand"><span className="logo"><b /></span><span>Planii</span></div>
        <button className="side-search" onClick={() => setCmd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span>Rechercher</span><span className="kbd">{CMD_LABEL}</span>
        </button>
        <nav className="side-nav">
          {NAV.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{I[k]}<span>{l}</span></button>
          ))}
          {me.admin && (
            <button className={tab === 'admin' ? 'on' : ''} onClick={() => setTab('admin')}>{ADMIN_ICON}<span>Admin</span></button>
          )}
        </nav>
        <div className="side-label">PROJETS</div>
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
                {HV.map(([v, l]) => <button key={v} className={homeView === v ? 'on' : ''} onClick={() => setHomeView(v)}>{l}</button>)}
              </div>
            )}
            {(tab === 'accueil' || tab === 'projets') && (
              <button className="newbtn" onClick={tab === 'accueil' ? () => setQuick(true) : newProject}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Nouveau
              </button>
            )}
            <span className="mobile-pill"><ThemeToggleButton /><NotifBell /></span>
            <Avatar name={me.name} />
          </div>
        </header>
        <div className="wrap">
          {tab === 'accueil' && <Home me={me} onOpen={setOpenId} refreshKey={refresh} view={homeView} setView={setHomeView} />}
          {tab === 'projets' && <ProjectsList onOpen={setOpenId} onJoin={() => setJoinOpen(true)} openSignal={newSignal} />}
          {tab === 'calendrier' && <CalendarView onOpen={setOpenId} />}
          {tab === 'classement' && <Leaderboard onOpen={setOpenId} />}
          {tab === 'profil' && <Profile me={me} onLogout={onLogout} onUpdate={onUpdate} onAdmin={() => setTab('admin')} />}
          {tab === 'admin' && me.admin && <Admin me={me} />}
        </div>
      </main>

      <nav className="bottomnav">
        {NAV.map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><span className="bic">{I[k]}</span>{l}</button>
        ))}
      </nav>
      <button className="fab" aria-label="Nouvelle tâche" onClick={() => setQuick(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>

      <CommandPalette open={cmd} onClose={() => setCmd(false)} setTab={setTab} openProject={setOpenId} newProject={newProject} />
      {quick && <QuickTask me={me} onClose={() => setQuick(false)} onCreated={() => { setQuick(false); setRefresh((k) => k + 1) }} />}

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

export default function App() {
  const [me, setMe] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    if (!getTok()) { setMe(null); return }
    api<{ user: User }>('GET', '/me').then((r) => { setMe(r.user); connectRealtime() }).catch(() => { setTok(null); setMe(null) })
    return () => disconnectRealtime()
  }, [])
  const onLogout = () => { disconnectRealtime(); setTok(null); setMe(null) }
  return (
    <>
      <Toaster />
      {me === undefined ? <div className="boot">Connexion…</div>
        : me ? <Shell me={me} onLogout={onLogout} onUpdate={setMe} />
        : <Auth onAuth={(u) => { setMe(u); connectRealtime() }} />}
    </>
  )
}
