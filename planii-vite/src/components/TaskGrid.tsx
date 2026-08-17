import { useState } from 'react'
import type { Task, TaskStatus, User } from '@/lib/types'
import { prio, prioMeta } from '@/lib/priority'
import { formatDue, isOverdue } from '@/lib/dates'
import { t as tt, trTerm } from '@/lib/i18n'
import { typeTone } from '@/lib/tasktype'
import { Avatar } from '@/lib/ui'
import { Ic } from './Icon'

export type GridGroup = { id: string; name: string; tasks: Task[] }

/** Luminance relative WCAG d'une couleur hex. */
function luminance(hex: string): number | null {
  const h = (hex || '').replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  const v = parseInt(full, 16)
  const lin = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/**
 * Couleur de texte lisible sur un aplat : on garde, du blanc ou du presque-noir,
 * celui qui offre le meilleur rapport de contraste. Les statuts étant colorés par
 * l'utilisateur, on ne peut pas figer le blanc — l'ambre le fait tomber à 2,1:1.
 */
export function readableOn(hex: string): string {
  const L = luminance(hex)
  if (L == null) return '#ffffff'
  const vsWhite = 1.05 / (L + 0.05)
  const vsInk = (L + 0.05) / 0.05544 // #101018
  return vsWhite >= vsInk ? '#ffffff' : '#101018'
}

export function TaskGrid({
  groups, statuses, statusOf, me, closed, memberName, subsOf,
  onToggle, onStatus, onPrio, onEdit,
}: {
  groups: GridGroup[]
  statuses: TaskStatus[]
  statusOf: (t: Task) => string
  me: User
  closed: boolean
  memberName: (id: string | null) => string
  subsOf: (id: string) => Task[]
  onToggle: (t: Task) => void
  onStatus: (t: Task) => void
  onPrio: (t: Task) => void
  onEdit: (t: Task) => void
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const cell = (t: Task, isSub: boolean) => {
    const st = statuses.find((s) => s.key === statusOf(t)) || statuses[0]
    const pm = prioMeta(t.priority)
    const over = isOverdue(t)
    const mine = t.assigneeId === me.id
    const subs = isSub ? [] : subsOf(t.id)
    const expanded = !!open[t.id]
    const fg = st ? readableOn(st.color) : '#ffffff'

    return (
      <div key={t.id} className={'tg-row' + (isSub ? ' sub' : '') + (t.done ? ' done' : '') + (over ? ' over' : '')}>
        {/* --- Tâche --- */}
        <div className="tg-c tg-title">
          <span className="tg-edge" style={{ background: st?.color || 'var(--line-strong)' }} aria-hidden="true" />
          {!isSub && (
            subs.length > 0 ? (
              <button
                className="tg-chev"
                onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}
                aria-expanded={expanded}
                aria-label={expanded ? tt('action.collapse') : tt('action.expand')}
              >
                <Ic name={expanded ? 'chevron-down' : 'chevron-right'} s={14} />
              </button>
            ) : <span className="tg-chev-sp" aria-hidden="true" />
          )}
          <button
            className={'check' + (t.done ? ' done' : ' ' + pm.ringCls) + (mine && !closed ? '' : ' locked')}
            disabled={!mine || closed}
            onClick={mine && !closed ? () => onToggle(t) : undefined}
            title={closed ? tt('pd.closedShort') : mine ? '' : tt('pd.onlyOwner')}
            aria-label={tt('home.check')}
          >
            {t.done ? <Ic name="check" s={12} c="#fff" strokeWidth={2.6} /> : (mine && !closed ? '' : <Ic name="lock" s={10} />)}
          </button>
          <button className="tg-name" onClick={() => onEdit(t)} title={tt('pd.mEdit')}>
            {t.type && <span className={'ttype ' + typeTone(t.type)}>{trTerm(t.type)}</span>}
            <span className="tg-label">{t.title}</span>
            {subs.length > 0 && (
              <span className="tg-subs tnum">{subs.filter((s) => s.done).length}/{subs.length}</span>
            )}
          </button>
        </div>

        {/* --- Responsable --- */}
        <div className="tg-c tg-who">
          {t.assigneeId
            ? <><Avatar name={memberName(t.assigneeId)} size={22} /><span className="tg-ell">{memberName(t.assigneeId)}</span></>
            : <span className="tg-none"><Ic name="hand" s={13} /> {tt('pd.toTakeCap')}</span>}
        </div>

        {/* --- Statut (aplat plein, cliquable) --- */}
        <button
          className={'tg-status' + (closed ? ' ro' : '')}
          style={{ background: st?.color || 'var(--surface-2)', color: fg }}
          disabled={closed}
          onClick={closed ? undefined : () => onStatus(t)}
          title={closed ? tt('pd.closedShort') : tt('pd.evStatus')}
        >
          {st ? trTerm(st.label) : '—'}
        </button>

        {/* --- Priorité --- */}
        <div className="tg-c tg-prio">
          <button
            className={'pflag ' + pm.flagCls + (closed ? '' : ' tg-clickable')}
            disabled={closed}
            onClick={closed ? undefined : () => onPrio(t)}
            title={closed ? tt('pd.closedShort') : tt('pd.mPrio')}
          >
            {pm.tag}
          </button>
        </div>

        {/* --- Échéance --- */}
        <div className="tg-c tg-due">
          {t.due ? <span className={over ? 'tg-late' : ''}>{formatDue(t.due)}</span> : <span className="tg-dash">—</span>}
        </div>

        {/* --- Heures --- */}
        <div className="tg-c tg-hours tnum">
          {t.spentHours != null || t.estHours != null
            ? <>{t.spentHours != null ? t.spentHours + ' h' : '0 h'}{t.estHours != null ? ` / ~${t.estHours} h` : ''}</>
            : <span className="tg-dash">—</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="tgrid">
      {groups.map((g) => (
        <section className="tg-group" key={g.id}>
          <header className="tg-ghead">
            <span className="tg-gname">{g.name}</span>
            <span className="tg-gcount tnum">{g.tasks.length} {tt('pd.taskCount')}</span>
          </header>

          {g.tasks.length === 0
            ? <div className="tg-empty">{tt('pd.noTask')}</div>
            : (
              <div className="tg-table" role="table" aria-label={g.name}>
                <div className="tg-row tg-head" role="row">
                  <span className="tg-c">{tt('ad.tasks')}</span>
                  <span className="tg-c">{tt('td.assignee')}</span>
                  <span className="tg-c tg-mid">{tt('meet.status')}</span>
                  <span className="tg-c tg-mid">{tt('td.priority')}</span>
                  <span className="tg-c">{tt('td.due')}</span>
                  <span className="tg-c">{tt('td.hours')}</span>
                </div>
                {g.tasks.map((t) => (
                  <div key={t.id} className="tg-block">
                    {cell(t, false)}
                    {open[t.id] && subsOf(t.id).map((s) => cell(s, true))}
                  </div>
                ))}
              </div>
            )}
        </section>
      ))}
    </div>
  )
}
