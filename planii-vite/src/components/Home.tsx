import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { formatDue, isOverdue, isoLocal } from '@/lib/dates'
import { useAllProjects } from '@/lib/useProjects'
import { taskPoints, levelOf, pointsFor } from '@/lib/points'
import { prio, prioMeta } from '@/lib/priority'
import { CalendarView } from './Calendar'
import { TaskDrawer } from './TaskDrawer'
import type { Project, Task, User } from '@/lib/types'

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
  const { projects, reload } = useAllProjects()
  const [drawerId, setDrawerId] = useState<string | null>(null)
  useEffect(() => { if (refreshKey) reload() }, [refreshKey, reload])
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

  return (
    <div>
      <LevelCard points={myPoints} />
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
