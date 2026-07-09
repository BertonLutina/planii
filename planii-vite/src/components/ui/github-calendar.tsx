import { useState, useEffect } from 'react'
import { format, subDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'

export interface ContributionDay {
  date: string // ISO date string (e.g., "2025-09-13")
  count: number
}

interface GitHubCalendarProps {
  data: ContributionDay[]
  colors?: string[]
}

const CELL = 17
const GAP = 4

// Planii purple scale by default (was GitHub greens)
export function GitHubCalendar({
  data,
  colors = ['#f1efe8', '#cecbf6', '#afa9ec', '#7f77dd', '#534ab7'],
}: GitHubCalendarProps) {
  const [contributions, setContributions] = useState<{ date: Date; count: number }[]>([])
  const today = new Date()
  const startDate = subDays(today, 364)
  const weeks = 53

  useEffect(() => {
    setContributions(data.map((item) => ({ count: item.count, date: new Date(item.date) })))
  }, [data])

  const getColor = (count: number) => {
    if (count === 0) return colors[0]
    if (count === 1) return colors[1]
    if (count === 2) return colors[2]
    if (count === 3) return colors[3]
    return colors[4] || colors[colors.length - 1]
  }

  const cellStyle = (bg: string, future = false): React.CSSProperties => ({
    width: CELL, height: CELL, borderRadius: 4,
    backgroundColor: future ? 'transparent' : bg,
    border: future ? '1px dashed var(--line)' : 'none',
  })

  const renderWeeks = () => {
    const weeksArray = []
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 })
    for (let i = 0; i < weeks; i++) {
      const weekDays = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
      })
      weeksArray.push(
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {weekDays.map((day, index) => {
            const contribution = contributions.find((c) => isSameDay(c.date, day))
            const color = contribution ? getColor(contribution.count) : colors[0]
            const future = day > today
            return (
              <div key={index} style={cellStyle(color, future)} title={`${format(day, 'PPP')} : ${contribution?.count || 0} tâche(s)`} />
            )
          })}
        </div>,
      )
      currentWeekStart = addDays(currentWeekStart, 7)
    }
    return weeksArray
  }

  const renderMonthLabels = () => {
    const months = []
    let currentMonth = startDate
    for (let i = 0; i < 12; i++) {
      months.push(
        <span key={i} style={{ fontSize: 11, color: 'var(--muted)' }}>{format(currentMonth, 'MMM')}</span>,
      )
      currentMonth = addDays(currentMonth, 30)
    }
    return months
  }

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', marginTop: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: 10, marginTop: 24 }}>
            {dayLabels.map((day, index) => (
              <span key={index} style={{ height: CELL, fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>{day}</span>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>{renderMonthLabels()}</div>
            <div style={{ display: 'flex', gap: GAP }}>{renderWeeks()}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6, fontSize: 11, alignItems: 'center', justifyContent: 'flex-end', color: 'var(--muted)' }}>
          <span>Moins</span>
          {colors.map((color, index) => (<div key={index} style={cellStyle(color)} />))}
          <span>Plus</span>
        </div>
      </div>
    </div>
  )
}
