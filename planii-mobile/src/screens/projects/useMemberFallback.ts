import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { ProjectSummary } from '@/lib/types'

/* Secours tant que le serveur n'envoie pas `memberPreview` dans la liste des projets :
   on lit les membres de chaque carte via `GET /projects/:id` (3 requêtes à la fois, en cache).
   On n'a alors que les noms, donc des initiales sans photo. Dès que le serveur renvoie
   `memberPreview`, ce secours ne s'exécute plus. */

type Preview = NonNullable<ProjectSummary['memberPreview']>
const cache = new Map<string, Preview>()

export function useMemberFallback(list: ProjectSummary[] | null): ProjectSummary[] | null {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!list) return
    const need = list.filter((p) => !p.memberPreview?.length && Number(p.memberCount) > 0 && !cache.has(p.id)).slice(0, 30)
    if (need.length === 0) return
    let alive = true
    let i = 0
    const worker = async () => {
      while (alive && i < need.length) {
        const p = need[i++]
        try {
          const r = await api<{ project: { members?: { id: string; name: string }[] } }>('GET', '/projects/' + p.id)
          cache.set(p.id, (r.project.members || []).slice(0, 4).map((m) => ({ id: m.id, name: m.name })))
        } catch {
          cache.set(p.id, [])
        }
        if (alive) setVersion((n) => n + 1)
      }
    }
    Promise.all([worker(), worker(), worker()])
    return () => { alive = false }
  }, [list])

  return useMemo(
    () => (list ? list.map((p) => (p.memberPreview?.length || !cache.get(p.id)?.length ? p : { ...p, memberPreview: cache.get(p.id) })) : list),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, version],
  )
}
