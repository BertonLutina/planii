import { useState, type CSSProperties } from 'react'
import type { Task, TaskStatus, User } from '@/lib/types'
import { prioMeta } from '@/lib/priority'
import { formatDue, isOverdue } from '@/lib/dates'
import { t as tt, trTerm } from '@/lib/i18n'
import { Ic } from './Icon'
import { PvAvatar } from './PvBits'

export type TableGroup = { status: TaskStatus; tasks: Task[] }

/** Vue Tableau : une carte par statut (les statuts vides sont masqués), lignes aérées, carte sur mobile. */
export function TaskTable({
  groups, empties, me, closed, memberName, subsOf,
  onToggle, onOpen, onStatus, onPrio, onMenu, canMenu, onAdd, onShowEmpty,
}: {
  groups: TableGroup[]
  empties: TaskStatus[]
  me: User
  closed: boolean
  memberName: (id: string | null) => string
  subsOf: (id: string) => Task[]
  onToggle: (t: Task) => void
  onOpen: (t: Task) => void
  onStatus: (t: Task) => void
  onPrio: (t: Task) => void
  onMenu: ((t: Task) => void) | null
  canMenu?: (t: Task) => boolean
  onAdd: (statusKey: string) => void
  onShowEmpty: (statusKey: string) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true })
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({})

  const row = (t: Task, st: TaskStatus, isSub: boolean) => {
    const pm = prioMeta(t.priority)
    const over = isOverdue(t)
    const mine = t.assigneeId === me.id
    const subs = isSub ? [] : subsOf(t.id)
    const files = t.attachmentCount || 0
    const style = { '--s': st.color } as CSSProperties
    return (
      <div key={t.id} style={style}
        className={'pv-row' + (isSub ? ' sub' : '') + (t.done ? ' done' : '')}
        onClick={(e) => { if (!(e.target as HTMLElement).closest('button,a,input,select,textarea,label')) onOpen(t) }}>
        <span className="pv-cell c-box">
          <button type="button" className={'pv-box' + (t.done ? ' done' : '')} disabled={!mine || closed}
            onClick={mine && !closed ? () => onToggle(t) : undefined}
            title={closed ? tt('pd.closedShort') : mine ? '' : tt('pd.onlyOwner')} aria-label={tt('home.check')}>
            {t.done && <Ic name="check" s={12} c="#fff" strokeWidth={3} />}
          </button>
        </span>
        <span className="pv-cell c-title">
          <span className="pv-ttl">
            <button type="button" aria-haspopup="dialog" onClick={() => onOpen(t)} title={tt('pd.mEdit')}>
              <span className="t"><span>{t.title}</span></span>
            </button>
            <small>
              {t.type ? trTerm(t.type) : tt('vw.none')}
              {!!t.commentCount && <span className="pv-msgs"><Ic name="message" s={15} />{t.commentCount}</span>}
              {subs.length > 0 && (
                <button type="button" className="pv-subchip" aria-expanded={!!openSubs[t.id]}
                  onClick={() => setOpenSubs((o) => ({ ...o, [t.id]: !o[t.id] }))}>
                  <Ic name="tasks" s={14} />{subs.filter((s) => s.done).length}/{subs.length}
                </button>
              )}
            </small>
          </span>
        </span>
        <span className="pv-cell c-who">
          {t.assigneeId
            ? <><PvAvatar name={memberName(t.assigneeId)} /><span className="pv-nm">{memberName(t.assigneeId)}</span></>
            : <span className="pv-none"><Ic name="hand" s={16} />{tt('pd.toTakeCap')}</span>}
        </span>
        <span className="pv-cell c-st">
          {closed
            ? <span className="pv-pill"><i />{trTerm(st.label)}</span>
            : <button type="button" className="pv-pill" onClick={() => onStatus(t)} title={tt('pd.evStatus')}><i />{trTerm(st.label)}</button>}
        </span>
        <span className="pv-cell c-pr">
          {closed
            ? <span className={'pv-pr p' + pm.n}><Ic name="flag" s={13} />{pm.tag}</span>
            : <button type="button" className={'pv-pr p' + pm.n} onClick={() => onPrio(t)} title={tt('pd.mPrio')}><Ic name="flag" s={13} />{pm.tag}</button>}
        </span>
        <span className="pv-cell c-due">
          {t.due
            ? <span className={'pv-due pv-tnum' + (over ? ' late' : '')}><Ic name={over ? 'alert' : 'calendar'} s={15} />{formatDue(t.due)}</span>
            : <span className="pv-due">—</span>}
        </span>
        <span className="pv-cell c-files">
          {files > 0 && <span className="pv-fb" title={tt('files.title')}><Ic name="paperclip" s={15} />{files}</span>}
        </span>
        <span className="pv-cell c-more">
          {onMenu && (!canMenu || canMenu(t)) && <button type="button" className="pv-more" onClick={() => onMenu(t)} aria-label={tt('pd.actions')}><Ic name="more" s={18} /></button>}
        </span>
      </div>
    )
  }

  return (
    <div className="pv-tscroll">
      <div className="pv-tbl">
        <div className="pv-cols" aria-hidden="true">
          <span /><span>{tt('ad.tasks')}</span><span>{tt('td.assignee')}</span><span>{tt('meet.status')}</span>
          <span>{tt('td.priority')}</span><span>{tt('td.due')}</span><span><Ic name="paperclip" s={16} /></span><span />
        </div>
        {groups.map(({ status: st, tasks }) => {
          const isCol = !!collapsed[st.key]
          const who = [...new Set(tasks.map((t) => t.assigneeId).filter(Boolean))] as string[]
          return (
            <div key={st.key} className={'pv-group' + (isCol ? ' collapsed' : '')} style={{ '--s': st.color } as CSSProperties}>
              <button type="button" className="pv-ghead" aria-expanded={!isCol} onClick={() => setCollapsed((c) => ({ ...c, [st.key]: !c[st.key] }))}>
                <Ic name="chevron-down" s={18} />
                <i className="pv-gdot" />
                <span className="pv-gname">{trTerm(st.label)}</span>
                <span className="pv-gcount">{tasks.length} {tt('pd.taskCount')}</span>
                <span className="pv-gsum"><span className="pv-stack">{who.slice(0, 4).map((id) => <PvAvatar key={id} name={memberName(id)} />)}</span></span>
              </button>
              <div className="pv-rows">
                {tasks.map((t) => (
                  <div key={t.id} style={{ display: 'contents' }}>
                    {row(t, st, false)}
                    {openSubs[t.id] && subsOf(t.id).map((s) => row(s, st, true))}
                  </div>
                ))}
                {!closed && <button type="button" className="pv-addrow" onClick={() => onAdd(st.key)}><Ic name="plus" s={18} />{tt('pv.addTask')}</button>}
              </div>
            </div>
          )
        })}
        {empties.length > 0 && (
          <div className="pv-empties">{tt('pv.emptyStatuses')}
            {empties.map((s) => <button key={s.key} type="button" onClick={() => onShowEmpty(s.key)}>{trTerm(s.label)}</button>)}
          </div>
        )}
      </div>
    </div>
  )
}
