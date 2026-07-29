import { useState } from 'react'
import { api } from '@/lib/api'
import { toastErr } from '@/lib/ui'
import { formatDue, isOverdue } from '@/lib/dates'
import { prioMeta } from '@/lib/priority'
import type { Project, Task, User } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { Ic } from './Icon'

/** Panneau de détail d'une tâche (droite sur desktop, feuille en bas sur mobile). */
export function TaskDrawer({ t, p, me, onClose, onChanged, onOpenProject }: {
  t: Task; p: Project; me: User; onClose: () => void; onChanged: () => void; onOpenProject: () => void
}) {
  const { t: tr } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const pm = prioMeta(t.priority)
  const mine = t.assigneeId === me.id
  const over = isOverdue(t)
  const member = p.members.find((m) => m.id === t.assigneeId)
  const subs = p.tasks.filter((s) => s.parentId === t.id)

  async function toggle(x: Task) {
    if (x.assigneeId !== me.id) { toastErr(tr('td.onlyOwner')); return }
    try { await api('PATCH', '/tasks/' + x.id, { done: !x.done }); onChanged() } catch (e: any) { toastErr(e.message) }
  }

  return (
    <div className="drawer-ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'drawer' + (expanded ? ' expanded' : '')} role="dialog" aria-modal="true" aria-labelledby="task-detail-title">
        <div className="drawer-head">
          <button className={'check' + (t.done ? ' done' : ' ' + pm.ringCls) + (mine ? '' : ' locked')} disabled={!mine} onClick={() => toggle(t)} aria-label={tr('home.check')}>{t.done ? '✓' : ''}</button>
          <span className="dt-title" id="task-detail-title">{t.title}</span>
          <button className="drawer-x" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Réduire' : 'Agrandir'} title={expanded ? 'Réduire' : 'Agrandir'}><Ic name={expanded ? 'chevron-down' : 'arrow-up-right'} s={17} /></button>
          <button className="drawer-x" onClick={onClose} aria-label={tr('action.close')}><Ic name="x" s={17} /></button>
        </div>
        <div className="drawer-body">
          <div className="drawer-main">
            {t.description ? <div className="drawer-desc">{t.description}</div> : <div className="drawer-desc muted">Aucune description.</div>}
          </div>
          <div className="drawer-side">
            <div className="drow"><span className="dl">{tr('td.priority')}</span><span className={'pflag ' + pm.flagCls}>{pm.tag}</span></div>
            <div className="drow"><span className="dl">{tr('td.project')}</span><span>{p.name}</span></div>
            <div className="drow"><span className="dl">{tr('td.assignee')}</span><span>{member ? member.name : tr('td.toTake')}</span></div>
            <div className="drow"><span className="dl">{tr('td.due')}</span><span style={over ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{t.due ? formatDue(t.due) : '—'}</span></div>
            <div className="drow"><span className="dl">{tr('td.hours')}</span><span>{t.spentHours != null ? t.spentHours + 'h' : '0h'} {tr('td.spent')}{t.estHours != null ? ` · ~${t.estHours}h ${tr('td.est')}` : ''}</span></div>
            {subs.length > 0 && (
              <div className="drawer-subs">
                <div className="dl" style={{ margin: '4px 0 8px' }}>{tr('td.subs')} · {subs.filter((s) => s.done).length}/{subs.length}</div>
                {subs.map((s) => (
                  <div key={s.id} className="dt-sub">
                    <button className={'check sm' + (s.done ? ' done' : '') + (s.assigneeId === me.id ? '' : ' locked')} disabled={s.assigneeId !== me.id} onClick={() => toggle(s)} aria-label={tr('home.check')}>{s.done ? '✓' : ''}</button>
                    <span className={s.done ? 'done-txt' : ''}>{s.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sheet-actions" style={{ marginTop: 18 }}>
          <button className="btn primary block" onClick={onOpenProject}>{tr('td.openProject')}</button>
        </div>
      </div>
    </div>
  )
}
