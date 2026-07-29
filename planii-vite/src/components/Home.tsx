import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { formatDue, isOverdue, isoLocal } from '@/lib/dates'
import { useMyTasks } from '@/lib/useProjects'
import { useRealtime } from '@/lib/realtime'
import { taskPoints, levelOf, pointsFor } from '@/lib/points'
import { prio, prioMeta } from '@/lib/priority'
import { Ic } from './Icon'
import { CalendarView } from './Calendar'
import { TaskDrawer } from './TaskDrawer'
import type { Project, Task, TaskStatus, TodayPayload, TodayTask, User } from '@/lib/types'
import { useI18n, t as tt, trTerm } from '@/lib/i18n'

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
  const { t: tr } = useI18n()
  const { projects, reload } = useMyTasks()
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [today, setToday] = useState<TodayPayload | null>(null)
  const [draggingTask, setDraggingTask] = useState<{ t: Task; p: Project } | null>(null)
  const pressRef = useRef<{ timer: number; item: { t: Task; p: Project }; x: number; y: number } | null>(null)
  const loadToday = () => api<{ today: TodayPayload }>('GET', '/today').then((r) => setToday(r.today)).catch((e: any) => toastErr(e.message))
  useEffect(() => { if (refreshKey) reload() }, [refreshKey, reload])
  useEffect(() => { loadToday() }, [])
  useRealtime((m) => { if (m.type === 'project' || m.type === 'notif') { reload(); loadToday() } })
  if (!projects) return <div className="empty">{tt('common.loading')}</div>

  let drawer: { t: Task; p: Project } | null = null
  if (drawerId) for (const p of projects) { const t = p.tasks.find((x) => x.id === drawerId); if (t) { drawer = { t, p }; break } }

  const mine: { t: Task; p: Project }[] = []
  projects.forEach((p) => p.tasks.forEach((t) => { if (t.assigneeId === me.id) mine.push({ t, p }) }))
  const myPoints = mine.reduce((s, x) => s + taskPoints(x.t), 0)
  const todo = mine.filter((x) => !x.t.done).sort((a, b) => {
    const pa = prio(a.t.priority), pb = prio(b.t.priority); if (pa !== pb) return pa - pb
    return (a.t.due || '9999').localeCompare(b.t.due || '9999')
  })
  const fallbackStatuses: TaskStatus[] = [
    { id: 'todo', key: 'todo', label: tt('term.todo'), color: '#9a988f', position: 0, fixed: true },
    { id: 'in_progress', key: 'in_progress', label: tt('term.doing'), color: '#3b82d6', position: 1, fixed: true },
    { id: 'review', key: 'review', label: tt('term.reviewSt'), color: '#9b5de5', position: 2, fixed: true },
    { id: 'transferred', key: 'transferred', label: tt('term.transferredSt'), color: '#f59f30', position: 3, fixed: false },
    { id: 'done', key: 'done', label: tt('term.doneSt'), color: '#4caf50', position: 99, fixed: true },
  ]
  const statusMap = new Map<string, TaskStatus>()
  for (const s of fallbackStatuses) statusMap.set(s.key, s)
  for (const p of projects) for (const s of p.statuses || []) statusMap.set(s.key, s)
  const statusOf = (t: Task) => t.statusKey || (t.done ? 'done' : 'todo')
  const statuses = [...statusMap.values()].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
  const tasksByStatus = statuses
    .map((s) => ({
      status: s,
      items: mine
        .filter((x) => statusOf(x.t) === s.key)
        .sort((a, b) => (a.t.done ? 1 : 0) - (b.t.done ? 1 : 0) || prio(a.t.priority) - prio(b.t.priority) || (a.t.due || '9999').localeCompare(b.t.due || '9999')),
    }))
    .filter((g) => g.items.length > 0 || ['todo', 'in_progress', 'review', 'transferred', 'done'].includes(g.status.key))

  async function toggle(t: Task) {
    try {
      await api('PATCH', '/tasks/' + t.id, { done: !t.done })
      if (!t.done) {
        const gained = pointsFor(t.due, isoLocal(new Date()))
        const when = !t.due ? '' : gained >= 20 ? tt('home.early') : gained <= 5 ? tt('home.late') : tt('home.onTime')
        toast(`Bravo ! +${gained} pts 🎉${when}`)
      }
      reload()
    } catch (e: any) { toastErr(e.message) }
  }

  async function moveHomeTask(t: Task, p: Project, statusKey: string) {
    if (statusKey === statusOf(t)) return
    const body: Record<string, unknown> = { statusKey }
    if (statusKey === 'transferred') {
      if (!t.transferable) { toastErr(tt('pd.notTransferable')); return }
      const other = p.members.find((m) => m.id !== (t.assigneeId || me.id))
      body.transferredTo = t.transferredTo || other?.id || null
    }
    try {
      await api('PATCH', '/tasks/' + t.id, body)
      toast(statusKey === 'transferred' ? tt('pd.taskTransferred') : tt('pd.statusOk'))
      reload()
    } catch (e: any) { toastErr(e.message) }
  }

  function clearPress() {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer)
    pressRef.current = null
  }

  function startPress(e: React.PointerEvent<HTMLElement>, item: { t: Task; p: Project }) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = e.currentTarget
    el.setPointerCapture?.(e.pointerId)
    clearPress()
    const timer = window.setTimeout(() => {
      pressRef.current = null
      setDraggingTask(item)
    }, 450)
    pressRef.current = { timer, item, x: e.clientX, y: e.clientY }
  }

  function movePress(e: React.PointerEvent<HTMLElement>) {
    const press = pressRef.current
    if (!press) return
    if (Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10) clearPress()
  }

  function endPress(e: React.PointerEvent<HTMLElement>, item: { t: Task; p: Project }) {
    const press = pressRef.current
    if (press) {
      clearPress()
      setDrawerId(item.t.id)
      return
    }
    if (draggingTask?.t.id === item.t.id) {
      const drop = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-home-status]')
      const statusKey = drop?.dataset.homeStatus
      setDraggingTask(null)
      if (statusKey) moveHomeTask(item.t, item.p, statusKey)
    }
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
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Ic name="list" s={15} />{tr('view.list')}</button>
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><Ic name="board" s={15} />{tr('view.board')}</button>
          <button className={view === 'agenda' ? 'on' : ''} onClick={() => setView('agenda')}><Ic name="calendar-days" s={15} />{tr('view.agenda')}</button>
        </div>
      </div>

      {view === 'list' && <>
        <div className="grp-h">{tr('home.todo')} · {todo.length}</div>
        <div className="priority-legend"><b>{tr('home.priority')}</b>
          <span><i className="p-dot p1" />P1</span>
          <span><i className="p-dot p2" />P2</span>
          <span><i className="p-dot p3" />P3</span>
          <span><i className="p-dot p4" />P4</span>
          <span><i className="p-dot p5" />P5</span>
          <span><i className="p-dot p6" />P6</span>
        </div>
        {mine.length === 0 && <div className="empty"><div className="big"><Ic name="circle-check" s={30} /></div>{tr('home.allDone')}</div>}
        <div className={'home-status-list' + (draggingTask ? ' dragging' : '')}>
          {tasksByStatus.map(({ status, items }) => (
            <section key={status.key} className={'home-status-group' + (draggingTask ? ' drop-ready' : '')} data-home-status={status.key}>
              <div className="home-status-head">
                <span><i style={{ background: status.color }} />{trTerm(status.label)}</span>
                <b>{items.length}</b>
              </div>
              {items.length === 0 && <div className="home-status-empty">{draggingTask ? tt('pd.dropHere') : tr('home.noTasks')}</div>}
              {items.map((item) => {
                const { t, p } = item
                const over = isOverdue(t)
                const pm = prioMeta(t.priority)
                const hasHours = t.spentHours != null || t.estHours != null
                return (
                  <div
                    key={t.id}
                    className={'home-task' + (t.done ? ' done' : '') + (over ? ' overdue' : '') + (draggingTask?.t.id === t.id ? ' dragging' : '')}
                    onPointerDown={(e) => startPress(e, item)}
                    onPointerMove={movePress}
                    onPointerUp={(e) => endPress(e, item)}
                    onPointerCancel={() => { clearPress(); setDraggingTask(null) }}
                  >
                    <button className={'check-big ' + (t.done ? 'done' : pm.ringCls)} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); toggle(t) }} aria-label={t.done ? tr('home.reopen') : tr('home.finish')}>{t.done ? <Ic name="check" s={14} c="#fff" /> : null}</button>
                    <div className="ht-body">
                      <div className="ht-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {pm.n < 6 && <span className={'pflag ' + pm.flagCls}>{pm.tag}</span>}
                        <span style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
                      </div>
                      {t.description && <div className="sub" style={{ marginTop: 2 }}>{t.description}</div>}
                      <div className="ht-project-name">{p.name}</div>
                    </div>
                    <div className="ht-meta">
                      <span className="chip-proj">{p.name}</span>
                      {t.due && <span className={'hm' + (over ? ' red' : '')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ic name="calendar" s={12} />{formatDue(t.due)}</span>}
                      {hasHours && <span className="hm">⏱ {t.spentHours != null ? t.spentHours + 'h' : '0h'}{t.estHours != null ? `/~${t.estHours}h` : ''}</span>}
                      {t.done && <span className="hm">+{taskPoints(t)} pts</span>}
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      </>}

      {view === 'board' && (
        boardCols.length === 0
          ? <div className="empty"><div className="big">▦</div>{tr('home.noTasks')}</div>
          : <div className="board">
            {boardCols.map(({ p, tasks }) => (
              <div key={p.id} className="board-col">
                <div className="board-head"><div className="board-who"><div><div className="nm">{p.name}</div><div className="sc">{tasks.filter((t) => !t.done).length} {tr('home.colTodo')}</div></div></div></div>
                <div className="board-tasks">
                  {tasks.map((t) => {
                    const pm = prioMeta(t.priority)
                    return (
                      <div key={t.id} className={'board-task' + (t.done ? ' done' : '')} style={{ cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => onOpen(p.id)}>
                        <button className={'check' + (t.done ? ' done' : ' ' + pm.ringCls)} onClick={(e) => { e.stopPropagation(); toggle(t) }} aria-label={tr('home.check')}>{t.done ? <Ic name="check" s={13} c="#fff" /> : null}</button>
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
  if (!today) return <div className="today-board"><div className="today-head"><div><h2>{tt('today.title')}</h2><p>{tt('today.loading')}</p></div></div></div>
  const sections: { key: keyof TodayPayload; title: string; tone: string; empty: string }[] = [
    { key: 'overdue', title: tt('today.overdue'), tone: 'danger', empty: tt('today.noOverdue') },
    { key: 'dueToday', title: tt('today.dueToday'), tone: 'accent', empty: tt('today.noDueToday') },
    { key: 'highPriority', title: tt('today.highPrio'), tone: 'warn', empty: tt('today.noHighPrio') },
    { key: 'transferred', title: tt('today.transferred'), tone: 'blue', empty: tt('today.noTransferred') },
    { key: 'review', title: tt('today.review'), tone: 'ok', empty: tt('today.noReview') },
  ]
  const total = sections.reduce((sum, s) => sum + (today[s.key] as TodayTask[]).length, 0)
  return (
    <section className="today-board">
      <div className="today-head">
        <div>
          <h2>{tt('today.title')}</h2>
          <p>{total ? tt('today.watch', { n: total }) : tt('today.calm')}</p>
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
          <div className="today-section-head"><b>{tt('today.discussions')}</b><span>{today.activeDiscussions.length}</span></div>
          {today.activeDiscussions.length === 0 ? <div className="today-empty">{tt('today.noMeeting')}</div> : today.activeDiscussions.map((d) => (
            <button key={d.projectId} className="today-discussion" onClick={() => onOpenProject(d.projectId)}>
              <span>{d.projectName}</span>
              <small>{d.count} {tt('today.messages')}</small>
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
