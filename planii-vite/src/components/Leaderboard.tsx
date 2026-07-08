import { useAllProjects } from '@/lib/useProjects'
import { projectPoints, levelOf, TEAM_BONUS } from '@/lib/points'
import { TYPE_LABEL } from '@/lib/dates'

export function Leaderboard({ onOpen }: { onOpen: (id: string) => void }) {
  const { projects } = useAllProjects()
  if (!projects) return <div className="empty">Chargement…</div>
  if (projects.length === 0) return <div className="empty"><div className="big">🏆</div>Aucune équipe pour l’instant. Créez ou rejoignez un projet !</div>

  const ranked = projects.map((p) => ({ p, base: projectPoints(p) })).sort((a, b) => b.base - a.base)
  // La meilleure équipe reçoit un vrai bonus (seulement s'il y a une compétition et des points).
  const bonusWon = ranked.length > 1 && ranked[0].base > 0

  return (
    <div>
      <div className="banner">🏆 La meilleure équipe / le meilleur groupe reçoit un supplément de <b>+{TEAM_BONUS} pts</b>. Barème : en avance 20 · le jour même 15 · en retard 5. Cochez vos tâches pour grimper !</div>
      {ranked.map((r, i) => {
        const bonus = i === 0 && bonusWon ? TEAM_BONUS : 0
        const total = r.base + bonus
        const l = levelOf(total)
        return (
          <div key={r.p.id} className={'rank rank-lead' + (i === 0 ? ' first' : '')} onClick={() => onOpen(r.p.id)}>
            <span className={'num' + (i === 0 ? ' top' : '')}>{i === 0 ? '🏆' : i + 1}</span>
            <div className="info">
              <div className="nm">{r.p.name}</div>
              <div className="sc">
                {TYPE_LABEL[r.p.type]} · Niveau {l.level} {l.medal}
                {bonus > 0 && <span className="bonus-tag">🎁 +{bonus} bonus</span>}
              </div>
            </div>
            <div className="rank-pts">{total}<span>pts</span></div>
          </div>
        )
      })}
    </div>
  )
}
