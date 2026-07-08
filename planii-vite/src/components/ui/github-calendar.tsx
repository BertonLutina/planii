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

  const renderWeeks = () => {
    const weeksArray = []
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 })
    for (let i = 0; i < weeks; i++) {
      const weekDays = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
      })
      weeksArray.push(
        <div key={i} className="flex flex-col gap-[3px]">
          {weekDays.map((day, index) => {
            const contribution = contributions.find((c) => isSameDay(c.date, day))
            const color = contribution ? getColor(contribution.count) : colors[0]
            const future = day > today
            return (
              <div
                key={index}
                className="w-3 h-3 rounded-[4px]"
                style={{ backgroundColor: future ? 'transparent' : color, border: future ? '1px dashed var(--line)' : 'none' }}
                title={`${format(day, 'PPP')} : ${contribution?.count || 0} tâche(s)`}
              />
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
        <span key={i} className="text-[10px]" style={{ color: 'var(--muted)' }}>
          {format(currentMonth, 'MMM')}
        </span>,
      )
      currentMonth = addDays(currentMonth, 30)
    }
    return months
  }

  const dayLabels = ['Lun', '', 'Mer', '', 'Ven', '', '']

  return (
    <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
      <div className="inline-flex flex-col gap-[6px]">
        <div className="flex" style={{ marginTop: 6 }}>
          <div className="flex flex-col justify-between mr-2" style={{ marginTop: 22 }}>
            {dayLabels.map((day, index) => (
              <span key={index} className="text-[10px] h-3" style={{ color: 'var(--muted)' }}>
                {day}
              </span>
            ))}
          </div>
          <div>
            <div className="flex w-full justify-between gap-4 mb-2">{renderMonthLabels()}</div>
            <div className="flex gap-[3px]">{renderWeeks()}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-[6px] text-[11px] items-center justify-end" style={{ color: 'var(--muted)' }}>
          <span>Moins</span>
          {colors.map((color, index) => (
            <div key={index} className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: color }} />
          ))}
          <span>Plus</span>
        </div>
      </div>
    </div>
  )
}
