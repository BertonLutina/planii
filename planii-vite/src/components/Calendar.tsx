import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { toastErr } from '@/lib/ui'
import {
  MONTHS, MONTHS_FULL, DOW, todayMid, isoLocal, parseISO, addDays, addMonths,
  isSameDay, isSameMonth, startOfWeekMon, monthGrid, formatDue, isOverdue, trunc,
} from '@/lib/dates'
import type { CalEvent, Project, ProjectSummary } from '@/lib/types'
import { GitHubCalendar, type ContributionDay } from './ui/github-calendar'

type View = 'mois' | 'semaine' | 'agenda' | 'annee'

export function CalendarView({ onOpen }: { onOpen: (id: string) => void }) {
  const [events, setEvents] = useState<CalEvent[] | null>(null)
  const [view, setView] = useState<View>('mois')
  const [cur, setCur] = useState<Date>(todayMid())

  useEffect(() => {
    (async () => {
      try {
        const { projects } = await api<{ projects: ProjectSummary[] }>('GET', '/projects')
        const all: CalEvent[] = []
        for (const p of projects) {
          const { project } = await api<{ project: Project }>('GET', '/projects/' + p.id)
          project.tasks.forEach((t) => {
            const d = parseISO(t.due)
            if (d) all.push({ id: t.id, date: d, title: t.title, done: t.done, over: isOverdue(t), pid: p.id, pname: p.name })
          })
          if (project.deadline) {
            const d = parseISO(project.deadline)
            if (d && project.status !== 'done') all.push({ id: 'dl-' + p.id, date: d, title: 'Livraison — ' + p.name, deadline: true, pid: p.id })
          }
        }
        setEvents(all)
      } catch (e: any) { setEvents([]); toastErr(e.message) }
    })()
  }, [])

  const contributionData = useMemo<ContributionDay[]>(() => {
    if (!events) return []
    const counts: Record<string, number> = {}
    events.forEach((e) => { const k = isoLocal(e.date); counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).map(([date, count]) => ({ date, count }))
  }, [events])

  if (!events) return <div className="empty">Chargement du calendrier…</div>

  const evOfDay = (d: Date) => events.filter((e) => isSameDay(e.date, d)).sort((a, b) => a.title.localeCompare(b.title))
  const today = todayMid()
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeekMon(cur), i))
  const color = (e: CalEvent) => e.deadline
    ? { bg: 'var(--accent-bg)', bd: 'var(--accent)', tx: 'var(--accent)' }
    : e.done ? { bg: 'var(--ok-bg)', bd: 'var(--ok)', tx: 'var(--ok)' }
    : e.over ? { bg: 'var(--danger-bg)', bd: 'var(--danger)', tx: 'var(--danger)' }
    : { bg: 'var(--surface-2)', bd: 'var(--accent)', tx: 'var(--text)' }

  const Chip = ({ e, mini }: { e: CalEvent; mini?: boolean }) => {
    const c = color(e)
    return (
      <div className="cal-ev" onClick={() => onOpen(e.pid)} style={{ background: c.bg, borderLeft: `3px solid ${c.bd}`, color: c.tx }}>
        {e.deadline ? '🚩 ' : e.done ? '✓ ' : ''}
        <span className="cal-ev-t">{mini ? trunc(e.title, 10) : trunc(e.title, 34)}</span>
      </div>
    )
  }

  const step = (d: number) => setCur(view === 'mois' ? addMonths(cur, d) : addDays(cur, d * 7))
  const title = view === 'mois' ? `${MONTHS_FULL[cur.getMonth()]} ${cur.getFullYear()}`
    : view === 'semaine' ? `${weekDays[0].getDate()}–${weekDays[6].getDate()} ${MONTHS_FULL[weekDays[6].getMonth()]}`
    : view === 'annee' ? 'Année — activité' : 'Agenda'

  return (
    <div className="cal-page">
      <div className="cal-bar">
        <div className="cal-nav">
          <button className="btn sm" onClick={() => setCur(todayMid())}>Aujourd’hui</button>
          <button className="btn sm" onClick={() => step(-1)}>‹</button>
          <button className="btn sm" onClick={() => step(1)}>›</button>
        </div>
        <div className="cal-title">{title}</div>
        <div className="tabs" style={{ margin: 0, flex: 'none' }}>
          {(['mois', 'semaine', 'agenda', 'annee'] as View[]).map((k) => (
            <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)} style={{ padding: '7px 11px' }}>
              {k === 'mois' ? 'Mois' : k === 'semaine' ? 'Semaine' : k === 'agenda' ? 'Agenda' : 'Année'}
            </button>
          ))}
        </div>
      </div>

      {view === 'annee' && <GitHubCalendar data={contributionData} />}

      {view === 'mois' && (
        <>
          <div className="cal-dow">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="cal-grid">
            {monthGrid(cur).map((d, i) => {
              const inM = isSameMonth(d, cur), isT = isSameDay(d, today), es = evOfDay(d)
              return (
                <div key={i} className={'cal-cell' + (inM ? '' : ' out') + (isT ? ' today' : '')}>
                  <div className="cal-num">{d.getDate()}</div>
                  {es.slice(0, 4).map((e) => <Chip key={e.id} e={e} mini />)}
                  {es.length > 4 && <div className="cal-more">+{es.length - 4}</div>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {view === 'semaine' && weekDays.map((d, i) => {
        const es = evOfDay(d), isT = isSameDay(d, today)
        return (
          <div key={i} className="card" style={{ padding: '12px 14px' }}>
            <div className="row" style={{ marginBottom: es.length ? 8 : 0 }}>
              <span style={{ fontWeight: 600, color: isT ? 'var(--accent)' : 'var(--text)' }}>
                {DOW[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()]}
              </span>
              {isT && <span className="pill acc">Aujourd’hui</span>}
            </div>
            {es.length === 0 ? <span className="sub">Rien de prévu</span> : es.map((e) => <Chip key={e.id} e={e} />)}
          </div>
        )
      })}

      {view === 'agenda' && (
        <>
          <div className="date-strip">
            {weekDays.map((d, i) => {
              const es = evOfDay(d); const isT = isSameDay(d, today)
              return (
                <button key={i} className={'ds-day' + (isT ? ' today' : '')} onClick={() => { setCur(d); setView('semaine') }}>
                  <span className="ds-dow">{DOW[(d.getDay() + 6) % 7]}</span>
                  <span className="ds-num">{d.getDate()}</span>
                  <span className="ds-dot" style={{ visibility: es.length ? 'visible' : 'hidden' }} />
                </button>
              )
            })}
          </div>
          {(() => {
            const up = events.filter((e) => e.date >= addDays(today, -1)).sort((a, b) => a.date.getTime() - b.date.getTime())
            if (!up.length) return <div className="empty">Aucune échéance à venir.</div>
            return up.map((e) => (
              <div key={e.id} className="card" style={{ padding: '12px 14px' }}>
                <div className="row">
                  <span style={{ fontWeight: 600 }}>{e.date.getDate()} {MONTHS[e.date.getMonth()]}</span>
                  <span className="sub" style={{ display: 'inline' }}>{formatDue(isoLocal(e.date))}</span>
                </div>
                <div style={{ marginTop: 8 }}><Chip e={e} /></div>
              </div>
            ))
          })()}
        </>
      )}
    </div>
  )
}
