import { useProjectSummaries } from '@/lib/useProjects'
import { projectPoints, levelOf, TEAM_BONUS } from '@/lib/points'
import { TYPE_LABEL } from '@/lib/dates'
import { Ic } from './Icon'
import { useI18n } from '@/lib/i18n'

export function Leaderboard({ onOpen }: { onOpen: (id: string) => void }) {
  const { t: tr } = useI18n()
  const { projects } = useProjectSummaries()
  if (!projects) return <div className="empty">Chargement…</div>
  if (projects.length === 0) return <div className="empty"><div className="big"><Ic name="trophy" s={30} c="var(--gold)" /></div>{tr('lb.empty')}</div>

  const ranked = projects.map((p) => ({ p, base: projectPoints(p) })).sort((a, b) => b.base - a.base)
  // La meilleure équipe reçoit un vrai bonus (seulement s'il y a une compétition et des points).
  const bonusWon = ranked.length > 1 && ranked[0].base > 0

  return (
    <div>
      <div className="banner"><Ic name="trophy" s={15} c="var(--gold)" /> {tr('lb.banner')} <b>+{TEAM_BONUS} pts</b>. {tr('lb.scale')}</div>
      {ranked.map((r, i) => {
        const bonus = i === 0 && bonusWon ? TEAM_BONUS : 0
        const total = r.base + bonus
        const l = levelOf(total)
        return (
          <div key={r.p.id} className={'rank rank-lead' + (i === 0 ? ' first' : '')} onClick={() => onOpen(r.p.id)}>
            <span className={'num' + (i === 0 ? ' top' : '')}>{i === 0 ? <Ic name="trophy" s={17} c="var(--gold)" /> : i + 1}</span>
            <div className="info">
              <div className="nm">{r.p.name}</div>
              <div className="sc">
                {TYPE_LABEL[r.p.type]} · {tr('lb.level')} {l.level} {l.medal}
                {bonus > 0 && <span className="bonus-tag"><Ic name="sparkles" s={12} c="var(--gold)" /> +{bonus} {tr('lb.bonus')}</span>}
              </div>
            </div>
            <div className="rank-pts">{total}<span>pts</span></div>
          </div>
        )
      })}
    </div>
  )
}
