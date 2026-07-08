import { api } from '@/lib/api'
import { toastErr } from '@/lib/ui'
import { formatDue, isOverdue } from '@/lib/dates'
import { prioMeta } from '@/lib/priority'
import type { Project, Task, User } from '@/lib/types'

/** Panneau de détail d'une tâche (droite sur desktop, feuille en bas sur mobile). */
export function TaskDrawer({ t, p, me, onClose, onChanged, onOpenProject }: {
  t: Task; p: Project; me: User; onClose: () => void; onChanged: () => void; onOpenProject: () => void
}) {
  const pm = prioMeta(t.priority)
  const mine = t.assigneeId === me.id
  const over = isOverdue(t)
  const member = p.members.find((m) => m.id === t.assigneeId)
  const subs = p.tasks.filter((s) => s.parentId === t.id)

  async function toggle(x: Task) {
    if (x.assigneeId !== me.id) { toastErr('Seul le responsable peut cocher cette tâche'); return }
    try { await api('PATCH', '/tasks/' + x.id, { done: !x.done }); onChanged() } catch (e: any) { toastErr(e.message) }
  }

  return (
    <div className="drawer-ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="drawer">
        <div className="drawer-head">
          <button className={'check' + (t.done ? ' done' : ' ' + pm.ringCls) + (mine ? '' : ' locked')} disabled={!mine} onClick={() => toggle(t)} aria-label="Cocher">{t.done ? '✓' : ''}</button>
          <span className="dt-title">{t.title}</span>
          <button className="drawer-x" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {t.description && <div className="drawer-desc">{t.description}</div>}
        <div className="drow"><span className="dl">Priorité</span><span className={'pflag ' + pm.flagCls}>{pm.tag}</span></div>
        <div className="drow"><span className="dl">Projet</span><span>{p.name}</span></div>
        <div className="drow"><span className="dl">Responsable</span><span>{member ? member.name : '— à prendre'}</span></div>
        <div className="drow"><span className="dl">Échéance</span><span style={over ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{t.due ? formatDue(t.due) : '—'}</span></div>
        <div className="drow"><span className="dl">Heures</span><span>{t.spentHours != null ? t.spentHours + 'h' : '0h'} passées{t.estHours != null ? ` · ~${t.estHours}h estimées` : ''}</span></div>
        {subs.length > 0 && (
          <div className="drawer-subs">
            <div className="dl" style={{ margin: '4px 0 8px' }}>Sous-tâches · {subs.filter((s) => s.done).length}/{subs.length}</div>
            {subs.map((s) => (
              <div key={s.id} className="dt-sub">
                <button className={'check sm' + (s.done ? ' done' : '') + (s.assigneeId === me.id ? '' : ' locked')} disabled={s.assigneeId !== me.id} onClick={() => toggle(s)} aria-label="Cocher">{s.done ? '✓' : ''}</button>
                <span className={s.done ? 'done-txt' : ''}>{s.title}</span>
              </div>
            ))}
          </div>
        )}
        <div className="sheet-actions" style={{ marginTop: 18 }}>
          <button className="btn primary block" onClick={onOpenProject}>Ouvrir le projet →</button>
        </div>
      </div>
    </div>
  )
}
