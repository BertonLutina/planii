import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { addDays, formatDue, isOverdue, isoLocal, parseISO, startOfWeekMon, todayMid } from '@/lib/dates'
import { useMyTasks, useProjectSummaries } from '@/lib/useProjects'
import { useRealtime } from '@/lib/realtime'
import { taskPoints, levelOf, pointsFor } from '@/lib/points'
import { prio, prioMeta } from '@/lib/priority'
import { Ic } from './Icon'
import { PvDropdown } from './PvDropdown'
import { CalendarView } from './Calendar'
import { TaskDrawer } from './TaskDrawer'
import type { ApiCalEvent, Project, Task, TaskStatus, TodayPayload, TodayTask, User } from '@/lib/types'
import { useI18n, t as tt, trTerm, getLang } from '@/lib/i18n'

type TodayKey = 'overdue' | 'dueToday' | 'highPriority' | 'transferred' | 'review'

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
  const { projects: summaries } = useProjectSummaries()
  const [filter, setFilter] = useState<TodayKey | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [skip, setSkip] = useState(0)
  const [weekEvents, setWeekEvents] = useState<ApiCalEvent[]>([])
  const [dayIdx, setDayIdx] = useState(() => (new Date().getDay() + 6) % 7)
  const loadToday = () => api<{ today: TodayPayload }>('GET', '/today').then((r) => setToday(r.today)).catch((e: any) => toastErr(e.message))
  useEffect(() => { if (refreshKey) reload() }, [refreshKey, reload])
  useEffect(() => { loadToday() }, [])
  const weekStart = useMemo(() => startOfWeekMon(todayMid()), [])
  useEffect(() => {
    api<{ events: ApiCalEvent[] }>('GET', `/calendar?from=${isoLocal(weekStart)}&to=${isoLocal(addDays(weekStart, 6))}`)
      .then((r) => setWeekEvents(r.events || [])).catch(() => setWeekEvents([]))
  }, [weekStart, refreshKey])
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

  async function toggle(t: Task) {
    try {
      await api('PATCH', '/tasks/' + t.id, { done: !t.done })
      if (!t.done) {
        const gained = pointsFor(t.due, isoLocal(new Date()))
        const when = !t.due ? '' : gained >= 20 ? tt('home.early') : gained <= 5 ? tt('home.late') : tt('home.onTime')
        toast(`Bravo ! +${gained} pts 🎉${when}`)
      }
      reload(); loadToday()
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
      reload(); loadToday()
    } catch (e: any) { toastErr(e.message) }
  }

  const boardCols = projects
    .map((p) => ({ p, tasks: mine.filter((x) => x.p.id === p.id).map((x) => x.t).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || prio(a.priority) - prio(b.priority)) }))
    .filter((c) => c.tasks.length > 0)

  // --- Accueil : ta journée, la semaine, les filtres et une seule liste ---
  const lang = getLang()
  const first = me.firstName || me.name.split(' ')[0]
  const byId = new Map<string, { t: Task; p: Project }>()
  projects.forEach((p) => p.tasks.forEach((t) => byId.set(t.id, { t, p })))
  const rowsOf = (list: TodayTask[]) => list.map((x) => byId.get(x.id)).filter(Boolean) as { t: Task; p: Project }[]
  const TILES: { key: TodayKey; title: string; tone: string; icon: string }[] = [
    { key: 'overdue', title: tt('today.overdue'), tone: 'dg', icon: 'alert' },
    { key: 'dueToday', title: tt('today.dueToday'), tone: '', icon: 'clock' },
    { key: 'highPriority', title: tt('today.highPrio'), tone: 'wn', icon: 'flag' },
    { key: 'transferred', title: tt('today.transferred'), tone: '', icon: 'transfer' },
    { key: 'review', title: tt('today.review'), tone: 'ok', icon: 'eye' },
  ]
  const countOf = (k: TodayKey) => (today ? today[k].length : 0)
  const watch = today ? countOf('overdue') + countOf('dueToday') + countOf('highPriority') : 0
  const autoKey = (['overdue', 'dueToday', 'highPriority'] as TodayKey[]).find((k) => countOf(k) > 0)
  /* Rien d'urgent : la liste montre directement toutes les tâches à faire, sans filtre à choisir. */
  const allMode = showAll || (filter === null && !autoKey)
  const activeKey: TodayKey = filter ?? autoKey ?? 'highPriority'
  const listRows = allMode ? todo : rowsOf(today ? today[activeKey] : [])
  const listTitle = allMode ? tr('home.todo') : TILES.find((x) => x.key === activeKey)!.title

  // Ta journée : en retard puis à faire aujourd'hui, la première tâche d'abord
  const queue = rowsOf([...(today?.overdue || []), ...(today?.dueToday || [])]).filter((x) => !x.t.done)
  const next = queue.length ? queue[skip % queue.length] : null
  const todayIso = isoLocal(new Date())
  const doneToday = mine.filter((x) => x.t.done && x.t.doneAt && isoLocal(new Date(x.t.doneAt)) === todayIso).length
  const dayTotal = doneToday + queue.length
  const ringOffset = 289 * (1 - (dayTotal ? doneToday / dayTotal : 0))

  // Cette semaine
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { d, iso: isoLocal(d), ev: weekEvents.filter((e) => e.date === isoLocal(d)) }
  })
  const dayEvents = days[dayIdx]?.ev || []
  const fmtD = (d: Date) => d.toLocaleDateString(lang, { day: 'numeric', month: 'short' })
  const weekLabel = `${fmtD(days[0].d)} – ${fmtD(days[6].d)}`
  const sumDone = (p: { taskCount: number; doneCount: number }) => (p.taskCount ? Math.round((p.doneCount / p.taskCount) * 100) : 0)
  const activeSummaries = (summaries || []).filter((p) => p.status !== 'done').slice(0, 5)

  const taskRow = ({ t, p }: { t: Task; p: Project }) => {
    const over = isOverdue(t)
    const pm = prioMeta(t.priority)
    const st = statusMap.get(statusOf(t))
    return (
      <div key={t.id} className={'hp-row' + (t.done ? ' done' : '')} style={{ ['--c' as string]: p.labelColor || 'var(--pv-acc)' }}>
        <button className="hp-box" onClick={() => toggle(t)} aria-label={t.done ? tr('home.reopen') : tr('home.finish')}>{t.done && <Ic name="check" s={13} c="#fff" strokeWidth={3} />}</button>
        <button className="hp-ti" onClick={() => setDrawerId(t.id)}>
          <b>{t.title}</b>
          <span className="hp-sub"><i />{p.name}{t.due && <><em>·</em><span className={over ? 'late' : ''}>{formatDue(t.due)}</span></>}</span>
        </button>
        {st && (
          <PvDropdown btnClass="hp-st" label={tt('hp.status')} align="right" button={<><i style={{ background: st.color }} />{trTerm(st.label)}</>}>
            {(close) => statuses.filter((x) => x.key !== statusOf(t)).map((x) => (
              <button key={x.key} type="button" role="menuitem" className="pv-dd-item" onClick={() => { close(); moveHomeTask(t, p, x.key) }}><i style={{ background: x.color }} />{trTerm(x.label)}</button>
            ))}
          </PvDropdown>
        )}
        <span className={'pv-pr p' + pm.n}><Ic name="flag" s={13} />{pm.tag}</span>
      </div>
    )
  }

  return (
    <div className="hp">
      <header className="hp-hello">
        <p className="eyebrow">{new Date().toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>{tt('hp.hello', { n: first })}</h1>
        <p>{!today ? tt('today.loading') : watch ? tt('today.watch', { n: watch }) : tt('today.calm')}</p>
      </header>

      <div className="home-toolbar only-mobile-flex">
        <div className="viewseg">
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Ic name="list" s={15} />{tr('view.list')}</button>
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><Ic name="board" s={15} />{tr('view.board')}</button>
          <button className={view === 'agenda' ? 'on' : ''} onClick={() => setView('agenda')}><Ic name="calendar-days" s={15} />{tr('view.agenda')}</button>
        </div>
      </div>

      {view === 'list' && <>
        <section className="hp-top">
          <article className="hp-day">
            <div className="hp-ring" role="img" aria-label={`${doneToday}/${dayTotal}`}>
              <svg viewBox="0 0 112 112" aria-hidden="true"><circle className="t" cx="56" cy="56" r="46" /><circle className="v" cx="56" cy="56" r="46" style={{ strokeDashoffset: ringOffset }} /></svg>
              <b className="pv-tnum">{doneToday}/{dayTotal}<small>{tt('hp.done')}</small></b>
            </div>
            <div className="hp-day-body">
              <h2>{tt('hp.day')}</h2>
              {next ? (
                <>
                  <p className="hp-next">{next.t.title}</p>
                  <div className="hp-meta"><span className="hp-sub" style={{ ['--c' as string]: next.p.labelColor || 'var(--pv-acc)' }}><i />{next.p.name}</span>{next.t.due && <span className={'hp-sub' + (isOverdue(next.t) ? ' late' : '')}>· {formatDue(next.t.due)}</span>}</div>
                  <div className="hp-act">
                    <button className="pv-btn acc sm" onClick={() => toggle(next.t)}><Ic name="check" s={16} />{tr('home.finish')}</button>
                    {queue.length > 1 && <button className="pv-btn ghost sm" onClick={() => setSkip((n) => n + 1)}>{tt('hp.skip')}</button>}
                  </div>
                </>
              ) : (
                <>
                  <p className="hp-next">{tt('hp.dayDone')}</p>
                  <div className="hp-meta">{tt('hp.dayDoneHint')}</div>
                </>
              )}
            </div>
          </article>

          <article className="hp-week">
            <header><h3>{tt('hp.week')}</h3><span>{weekLabel}</span></header>
            <div className="hp-days" role="group" aria-label={tt('hp.week')}>
              {days.map((x, i) => (
                <button key={x.iso} type="button" className={'hp-d' + (x.iso === todayIso ? ' today' : '') + (dayIdx === i ? ' on' : '')} aria-pressed={dayIdx === i} onClick={() => setDayIdx(i)}>
                  <small>{x.d.toLocaleDateString(lang, { weekday: 'narrow' })}</small>
                  <b className="pv-tnum">{x.d.getDate()}</b>
                  <i>{x.ev.slice(0, 3).map((e) => <u key={e.id} className={e.done ? '' : (!e.deadline && parseISO(e.date)! < todayMid() ? 'dg' : '')} />)}</i>
                </button>
              ))}
            </div>
            <ul className="hp-wl">
              {dayEvents.length === 0 && <li className="none">{tt('hp.nothingDay')}</li>}
              {dayEvents.slice(0, 4).map((e) => <li key={e.id}><Ic name={e.deadline ? 'flag' : 'calendar'} s={14} />{e.title}{e.projectName ? <small>{e.projectName}</small> : null}</li>)}
            </ul>
          </article>
        </section>

        <section className="hp-tiles" aria-label={tt('hp.filter')}>
          {TILES.map((x) => (
            <button key={x.key} type="button" className={'hp-tile ' + x.tone + (!allMode && activeKey === x.key ? ' on' : '')} aria-pressed={!allMode && activeKey === x.key}
              onClick={() => { setFilter(x.key); setShowAll(false) }}>
              <span className="t"><span><Ic name={x.icon} s={15} /></span>{x.title}</span>
              <strong className="pv-tnum">{countOf(x.key)}</strong>
            </button>
          ))}
        </section>

        <section className="hp-cols">
          <article className="hp-list">
            <div className="hp-lh"><h3>{listTitle}</h3><span className="hp-cnt pv-tnum">{listRows.length}</span></div>
            {listRows.length === 0
              ? <div className="hp-empty"><b>{mine.length === 0 ? tr('home.allDone') : tt('hp.none')}</b></div>
              : <div>{listRows.slice(0, allMode ? 50 : 8).map(taskRow)}</div>}
            {(showAll || autoKey || filter !== null) && todo.length > 0 && (
              <button className="hp-more" onClick={() => { setShowAll((v) => !v); if (showAll) setFilter((f) => f ?? autoKey ?? null) }}>{showAll ? tt('hp.backFilter') : tt('hp.seeAll', { n: todo.length })}</button>
            )}
          </article>
          <div className="hp-side">
            <LevelCard points={myPoints} />
            <article className="hp-card">
              <h3>{tt('hp.projects')}</h3>
              {activeSummaries.length === 0 && <p className="hp-quiet">{tt('hp.none')}</p>}
              {activeSummaries.map((p) => (
                <button key={p.id} className="hp-pj" style={{ ['--c' as string]: p.labelColor || 'var(--pv-acc)' }} onClick={() => onOpen(p.id)}>
                  <span className="hp-logo">{p.name.slice(0, 2).toUpperCase()}</span>
                  <span className="nm"><b>{p.name}</b><span className="hp-track"><i style={{ width: sumDone(p) + '%' }} /></span></span>
                  <em className="pv-tnum">{sumDone(p)}%</em>
                </button>
              ))}
            </article>
            <article className="hp-card">
              <h3>{tt('today.discussions')}</h3>
              {!today || today.activeDiscussions.length === 0
                ? <p className="hp-quiet">{tt('today.noMeeting')}</p>
                : today.activeDiscussions.map((d) => (
                  <button key={d.projectId} className="hp-disc" onClick={() => onOpen(d.projectId)}><span>{d.projectName}</span><small>{d.count} {tt('today.messages')}</small></button>
                ))}
            </article>
          </div>
        </section>
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
