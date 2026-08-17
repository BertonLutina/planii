import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRealtime } from '@/lib/realtime'
import { projectComparator, type Dir, type ProjSort } from '@/lib/sort'
import type { PaginatedResponse, ProjectLabel, ProjectSummary } from '@/lib/types'

/* Chargement de la liste des projets — même contrat que
   `planii-vite/src/components/Projects.tsx` : pagination en tri « titre »,
   liste complète en tri « manuel » (pour pouvoir réordonner), plus la
   récupération des libellés. */

export const DEFAULT_PROJECT_LABELS: ProjectLabel[] = [
  { id: 'default-work', label: 'Travail', color: '#f59e0b', position: 0, fixed: true },
  { id: 'default-private', label: 'Privé', color: '#ef4444', position: 1, fixed: true },
]

export type ProjTab = 'active' | 'done'

export function useProjectsList() {
  const [tab, setTab] = useState<ProjTab>('active')
  const [sort, setSort] = useState<ProjSort>('title')
  const [dir, setDir] = useState<Dir>('asc')

  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [labels, setLabels] = useState<ProjectLabel[]>(DEFAULT_PROJECT_LABELS)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [counts, setCounts] = useState({ active: 0, done: 0 })
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (pageNum = 1, append = false) => {
    const paginate = sort !== 'manual'
    const path = paginate ? `/projects?page=${pageNum}&limit=24&status=${tab}` : `/projects?status=${tab}`
    if (append) setLoadingMore(true)
    try {
      const r = paginate
        ? await api<PaginatedResponse<ProjectSummary> & { counts: { active: number; done: number } }>('GET', path)
        : await api<{ projects: ProjectSummary[] }>('GET', path)
      if ('items' in r) {
        setProjects((prev) => (append && prev ? [...prev, ...r.items] : r.items))
        setPage(r.page)
        setTotal(r.total)
        setHasMore(r.hasMore)
        setCounts(r.counts)
      } else {
        setProjects(r.projects)
        setPage(1)
        setTotal(r.projects.length)
        setHasMore(false)
        setCounts({
          active: r.projects.filter((p) => p.status !== 'done').length,
          done: r.projects.filter((p) => p.status === 'done').length,
        })
      }
      setError(null)
      try {
        const lr = await api<{ labels: ProjectLabel[] }>('GET', '/project-labels')
        setLabels(lr.labels.length ? lr.labels : DEFAULT_PROJECT_LABELS)
      } catch { setLabels(DEFAULT_PROJECT_LABELS) }
    } catch (e) {
      setError((e as Error).message)
      if (!append) setProjects([])
    } finally {
      setLoadingMore(false)
    }
  }, [tab, sort])

  useEffect(() => { setProjects(null); load(1, false) }, [load])

  useRealtime((m) => { if (m.type === 'project' || m.type === 'notif') load(1, false) })

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load(1, false)
    setRefreshing(false)
  }, [load])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) load(page + 1, true)
  }, [loadingMore, hasMore, page, load])

  /** Liste triée telle qu'affichée. */
  const list = projects ? projects.slice().sort(projectComparator(sort, dir)) : null

  /** Réordonnancement manuel : déplace un projet d'un cran (PUT /projects/order). */
  const move = useCallback(async (id: string, delta: -1 | 1) => {
    if (!list) return
    const ids = list.map((p) => p.id)
    const from = ids.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    /* Optimiste : on réordonne localement avant l'aller-retour serveur. */
    const byId = new Map(list.map((p) => [p.id, p]))
    setProjects(ids.map((x, i) => ({ ...byId.get(x)!, position: i })))
    try {
      await api('PUT', '/projects/order', { ids })
      await load(1, false)
    } catch (e) {
      await load(1, false)
      throw e
    }
  }, [list, load])

  const canReorder = sort === 'manual' && tab === 'active'

  return {
    tab, setTab, sort, setSort, dir, setDir,
    projects, list, labels, error, counts,
    hasMore, total, loadingMore, refreshing,
    load, loadMore, refresh, move, canReorder,
  }
}
