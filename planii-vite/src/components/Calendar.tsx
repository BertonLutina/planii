import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { toastErr } from '@/lib/ui'
import {
  MONTHS, MONTHS_FULL, DOW, todayMid, isoLocal, parseISO, addDays, addMonths,
  isSameDay, isSameMonth, startOfWeekMon, monthGrid, formatDue, trunc,
} from '@/lib/dates'
import type { ApiCalEvent, CalEvent } from '@/lib/types'
import { useI18n, getLang } from '@/lib/i18n'
import { GitHubCalendar, type ContributionDay } from './ui/github-calendar'

type View = 'mois' | 'semaine' | 'jour' | 'agenda' | 'annee'

export function CalendarView({ onOpen }: { onOpen: (id: string) => void }) {
  const { t: tr } = useI18n()
  const [events, setEvents] = useState<CalEvent[] | null>(null)
  const [view, setView] = useState<View>('mois')
  const [cur, setCur] = useState<Date>(todayMid())

  useEffect(() => {
    (async () => {
      try {
        const year = cur.getFullYear()
        const from = `${year - 1}-01-01`
        const to = `${year + 1}-12-31`
        const { events: raw } = await api<{ events: ApiCalEvent[] }>('GET', `/calendar?from=${from}&to=${to}`)
        const all: CalEvent[] = raw.flatMap((e) => {
          const d = parseISO(e.date)
          if (!d) return []
          const done = !!e.done
          const over = !e.deadline && !done && d < todayMid()
          return [{
            id: e.id,
            date: d,
            title: e.title,
            done,
            over,
            deadline: e.deadline,
            pid: e.projectId,
            pname: e.projectName,
          }]
        })
        setEvents(all)
      } catch (e: any) { setEvents([]); toastErr(e.message) }
    })()
  }, [cur.getFullYear()])

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

  const step = (d: number) => setCur(view === 'mois' ? addMonths(cur, d) : view === 'jour' ? addDays(cur, d) : addDays(cur, d * 7))
  const title = view === 'mois' ? `${MONTHS_FULL[cur.getMonth()]} ${cur.getFullYear()}`
    : view === 'semaine' ? `${weekDays[0].getDate()}–${weekDays[6].getDate()} ${MONTHS_FULL[weekDays[6].getMonth()]}`
    : view === 'jour' ? cur.toLocaleDateString(getLang(), { weekday: 'long', day: 'numeric', month: 'long' })
    : view === 'annee' ? tr('cal.yearTitle') : tr('cal.agendaView')

  return (
    <div className="cal-page">
      <div className="cal-bar">
        <div className="cal-nav">
          <button className="btn sm" onClick={() => setCur(todayMid())}>{tr('cal.today')}</button>
          <button className="btn sm" onClick={() => step(-1)}>‹</button>
          <button className="btn sm" onClick={() => step(1)}>›</button>
        </div>
        <div className="cal-title">{title}</div>
        <div className="tabs" style={{ margin: 0, flex: 'none' }}>
          {(['mois', 'semaine', 'jour', 'agenda', 'annee'] as View[]).map((k) => (
            <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)} style={{ padding: '7px 11px' }}>
              {k === 'mois' ? tr('cal.month') : k === 'semaine' ? tr('cal.week') : k === 'jour' ? tr('cal.day') : k === 'agenda' ? tr('cal.agendaView') : tr('cal.year')}
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
              {isT && <span className="pill acc">{tr('cal.today')}</span>}
            </div>
            {es.length === 0 ? <span className="sub">{tr('cal.nothing')}</span> : es.map((e) => <Chip key={e.id} e={e} />)}
          </div>
        )
      })}

      {view === 'jour' && (() => {
        const es = evOfDay(cur); const isT = isSameDay(cur, today)
        return (
          <div className="card" style={{ padding: '16px 18px' }}>
            <div className="row" style={{ marginBottom: es.length ? 12 : 0 }}>
              <span style={{ fontWeight: 600, fontSize: 16, textTransform: 'capitalize', color: isT ? 'var(--accent)' : 'var(--text)' }}>
                {cur.toLocaleDateString(getLang(), { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              {isT && <span className="pill acc">{tr('cal.today')}</span>}
            </div>
            {es.length === 0 ? <span className="sub">{tr('cal.nothingDay')}</span>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{es.map((e) => <Chip key={e.id} e={e} />)}</div>}
          </div>
        )
      })()}

      {view === 'agenda' && (
        <>
          <div className="date-strip">
            {weekDays.map((d, i) => {
              const es = evOfDay(d); const isT = isSameDay(d, today)
              return (
                <button key={i} className={'ds-day' + (isT ? ' today' : '')} onClick={() => { setCur(d); setView('jour') }}>
                  <span className="ds-dow">{DOW[(d.getDay() + 6) % 7]}</span>
                  <span className="ds-num">{d.getDate()}</span>
                  <span className="ds-dot" style={{ visibility: es.length ? 'visible' : 'hidden' }} />
                </button>
              )
            })}
          </div>
          {(() => {
            const up = events.filter((e) => e.date >= addDays(today, -1)).sort((a, b) => a.date.getTime() - b.date.getTime())
            if (!up.length) return <div className="empty">{tr('cal.noUpcoming')}</div>
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
