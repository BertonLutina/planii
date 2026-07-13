import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { formatDue, isOverdue, isoLocal } from '@/lib/dates'
import { useMyTasks } from '@/lib/useProjects'
import { useRealtime } from '@/lib/realtime'
import { taskPoints, levelOf, pointsFor } from '@/lib/points'
import { prio, prioMeta } from '@/lib/priority'
import { CalendarView } from './Calendar'
import { TaskDrawer } from './TaskDrawer'
import type { Project, Task, TodayPayload, TodayTask, User } from '@/lib/types'

export function LevelCard({ points, name }: { points: number; name?: string }) {
  const l = levelOf(points)
  return (
    <div className="score-card">
      <div className="score-top">
        <div>
          <div className="score-hi">{name ? name : 'Mon score'}</div>
          <div className="score-pts"><span className="score-num">{points}</span> pts</div>
        </div>
        <div className="score-level">{l.medal}<span>Niveau {l.level}</span></div>
      </div>
      <div className="score-bar"><i style={{ width: l.pct + '%' }} /></div>
      <div className="score-next">Plus que {l.toNext} pts pour le niveau {l.level + 1}</div>
    </div>
  )
}

export function Home({ me, onOpen, refreshKey, view, setView }: { me: User; onOpen: (id: string) => void; refreshKey?: number; view: 'list' | 'board' | 'agenda'; setView: (v: 'list' | 'board' | 'agenda') => void }) {
  const { projects, reload } = useMyTasks()
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [today, setToday] = useState<TodayPayload | null>(null)
  const loadToday = () => api<{ today: TodayPayload }>('GET', '/today').then((r) => setToday(r.today)).catch((e: any) => toastErr(e.message))
  useEffect(() => { if (refreshKey) reload() }, [refreshKey, reload])
  useEffect(() => { loadToday() }, [])
  useRealtime((m) => { if (m.type === 'project' || m.type === 'notif') { reload(); loadToday() } })
  if (!projects) return <div className="empty">Chargement…</div>

  let drawer: { t: Task; p: Project } | null = null
  if (drawerId) for (const p of projects) { const t = p.tasks.find((x) => x.id === drawerId); if (t) { drawer = { t, p }; break } }

  const mine: { t: Task; p: Project }[] = []
  projects.forEach((p) => p.tasks.forEach((t) => { if (t.assigneeId === me.id) mine.push({ t, p }) }))
  const myPoints = mine.reduce((s, x) => s + taskPoints(x.t), 0)
  const todo = mine.filter((x) => !x.t.done).sort((a, b) => {
    const pa = prio(a.t.priority), pb = prio(b.t.priority); if (pa !== pb) return pa - pb
    return (a.t.due || '9999').localeCompare(b.t.due || '9999')
  })
  const done = mine.filter((x) => x.t.done)

  async function toggle(t: Task) {
    try {
      await api('PATCH', '/tasks/' + t.id, { done: !t.done })
      if (!t.done) {
        const gained = pointsFor(t.due, isoLocal(new Date()))
        const when = !t.due ? '' : gained >= 20 ? ' — en avance !' : gained <= 5 ? ' — en retard' : ' — dans les temps'
        toast(`Bravo ! +${gained} pts 🎉${when}`)
      }
      reload()
    } catch (e: any) { toastErr(e.message) }
  }

  const boardCols = projects
    .map((p) => ({ p, tasks: mine.filter((x) => x.p.id === p.id).map((x) => x.t).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || prio(a.priority) - prio(b.priority)) }))
    .filter((c) => c.tasks.length > 0)

  const openTodayTask = (t: TodayTask) => onOpen(t.projectId)

  return (
    <div>
      <LevelCard points={myPoints} />
      <TodayDashboard today={today} onOpenTask={openTodayTask} onOpenProject={onOpen} />
      <div className="home-toolbar only-mobile-flex">
        <div className="viewseg">
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>☰ Liste</button>
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>▦ Tableau</button>
          <button className={view === 'agenda' ? 'on' : ''} onClick={() => setView('agenda')}>📅 Agenda</button>
        </div>
      </div>

      {view === 'list' && <>
        <div className="grp-h">À FAIRE · {todo.length}</div>
        <div className="priority-legend"><b>Priorité :</b>
          <span><i className="p-dot p1" />P1</span>
          <span><i className="p-dot p2" />P2</span>
          <span><i className="p-dot p3" />P3</span>
          <span><i className="p-dot p4" />P4</span>
          <span><i className="p-dot p5" />P5</span>
          <span><i className="p-dot p6" />P6</span>
        </div>
        {todo.length === 0 && <div className="empty"><div className="big">🎉</div>Rien à faire — tout est à jour, bravo !</div>}
        {todo.map(({ t, p }) => {
          const over = isOverdue(t)
          const pm = prioMeta(t.priority)
          const hasHours = t.spentHours != null || t.estHours != null
          return (
            <div key={t.id} className={'home-task' + (over ? ' overdue' : '')}>
              <button className={'check-big ' + pm.ringCls} onClick={(e) => { e.stopPropagation(); toggle(t) }} aria-label="Terminer" />
              <div className="ht-body" onClick={() => setDrawerId(t.id)}>
                <div className="ht-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {pm.n < 6 && <span className={'pflag ' + pm.flagCls}>{pm.tag}</span>}
                  <span style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
                </div>
                {t.description && <div className="sub" style={{ marginTop: 2 }}>{t.description}</div>}
                <div className="ht-project-name">{p.name}</div>
              </div>
              <div className="ht-meta" onClick={() => setDrawerId(t.id)}>
                <span className="chip-proj">{p.name}</span>
                {t.due && <span className={'hm' + (over ? ' red' : '')}>📅 {formatDue(t.due)}</span>}
                {hasHours && <span className="hm">⏱ {t.spentHours != null ? t.spentHours + 'h' : '0h'}{t.estHours != null ? `/~${t.estHours}h` : ''}</span>}
              </div>
            </div>
          )
        })}
        {done.length > 0 && (
          <>
            <div className="grp-h">TERMINÉES · {done.length}</div>
            {done.map(({ t, p }) => (
              <div key={t.id} className="home-task done">
                <button className="check-big done" onClick={() => toggle(t)} aria-label="Rouvrir">✓</button>
                <div className="ht-body" onClick={() => setDrawerId(t.id)}>
                  <div className="ht-title">{t.title}</div>
                </div>
                <div className="ht-meta" onClick={() => setDrawerId(t.id)}><span className="chip-proj">{p.name}</span><span className="hm">+{taskPoints(t)} pts</span></div>
              </div>
            ))}
          </>
        )}
      </>}

      {view === 'board' && (
        boardCols.length === 0
          ? <div className="empty"><div className="big">▦</div>Aucune tâche à afficher.</div>
          : <div className="board">
            {boardCols.map(({ p, tasks }) => (
              <div key={p.id} className="board-col">
                <div className="board-head"><div className="board-who"><div><div className="nm">{p.name}</div><div className="sc">{tasks.filter((t) => !t.done).length} à faire</div></div></div></div>
                <div className="board-tasks">
                  {tasks.map((t) => {
                    const pm = prioMeta(t.priority)
                    return (
                      <div key={t.id} className={'board-task' + (t.done ? ' done' : '')} style={{ cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => onOpen(p.id)}>
                        <button className={'check' + (t.done ? ' done' : ' ' + pm.ringCls)} onClick={(e) => { e.stopPropagation(); toggle(t) }} aria-label="Cocher">{t.done ? '✓' : ''}</button>
                        <span className="bt-title" style={{ whiteSpace: 'normal' }}>
                          {pm.n < 6 && <span className={'pflag ' + pm.flagCls} style={{ marginRight: 5 }}>{pm.tag}</span>}
                          {t.title}{t.due ? ` · ${formatDue(t.due)}` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
      )}

      {view === 'agenda' && <div style={{ marginTop: 6 }}><CalendarView onOpen={onOpen} /></div>}

      {drawer && (
        <TaskDrawer
          t={drawer.t}
          p={drawer.p}
          me={me}
          onClose={() => setDrawerId(null)}
          onChanged={reload}
          onOpenProject={() => { const pid = drawer!.p.id; setDrawerId(null); onOpen(pid) }}
        />
      )}
    </div>
  )
}

function TodayDashboard({ today, onOpenTask, onOpenProject }: { today: TodayPayload | null; onOpenTask: (t: TodayTask) => void; onOpenProject: (id: string) => void }) {
  if (!today) return <div className="today-board"><div className="today-head"><div><h2>Aujourd’hui</h2><p>Chargement de tes priorités…</p></div></div></div>
  const sections: { key: keyof TodayPayload; title: string; tone: string; empty: string }[] = [
    { key: 'overdue', title: 'En retard', tone: 'danger', empty: 'Aucun retard.' },
    { key: 'dueToday', title: 'À faire aujourd’hui', tone: 'accent', empty: 'Rien à rendre aujourd’hui.' },
    { key: 'highPriority', title: 'Priorités fortes', tone: 'warn', empty: 'Aucune priorité P1/P2.' },
    { key: 'transferred', title: 'Transférées', tone: 'blue', empty: 'Aucune tâche transférée.' },
    { key: 'review', title: 'À valider', tone: 'ok', empty: 'Rien en revue.' },
  ]
  const total = sections.reduce((sum, s) => sum + (today[s.key] as TodayTask[]).length, 0)
  return (
    <section className="today-board">
      <div className="today-head">
        <div>
          <h2>Aujourd’hui</h2>
          <p>{total ? `${total} point${total > 1 ? 's' : ''} à surveiller maintenant.` : 'Tout est calme pour le moment.'}</p>
        </div>
        <span className="today-pill">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
      </div>
      <div className="today-grid">
        {sections.map((s) => {
          const items = today[s.key] as TodayTask[]
          return (
            <div key={s.key} className={'today-section ' + s.tone}>
              <div className="today-section-head"><b>{s.title}</b><span>{items.length}</span></div>
              {items.length === 0 ? <div className="today-empty">{s.empty}</div> : items.slice(0, 5).map((t) => <TodayTaskCard key={s.key + t.id} t={t} onOpen={() => onOpenTask(t)} />)}
            </div>
          )
        })}
        <div className="today-section discussions">
          <div className="today-section-head"><b>Discussions actives</b><span>{today.activeDiscussions.length}</span></div>
          {today.activeDiscussions.length === 0 ? <div className="today-empty">Aucun meeting récent.</div> : today.activeDiscussions.map((d) => (
            <button key={d.projectId} className="today-discussion" onClick={() => onOpenProject(d.projectId)}>
              <span>{d.projectName}</span>
              <small>{d.count} message{d.count > 1 ? 's' : ''}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function TodayTaskCard({ t, onOpen }: { t: TodayTask; onOpen: () => void }) {
  const pm = prioMeta(t.priority)
  return (
    <button className="today-task-card" onClick={onOpen}>
      <span className={'pflag ' + pm.flagCls}>{pm.tag}</span>
      <span className="today-task-main">
        <b>{t.title}</b>
        <small>{t.projectName}{t.due ? ' · ' + formatDue(t.due) : ''}</small>
      </span>
      {t.statusKey === 'transferred' && <span className="today-transfer">⇄</span>}
    </button>
  )
}
