import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/types'
import { errMsg } from '@/screens/project/lib/flow'

/** Réponse d'une liste admin paginée. `/admin/audit` ajoute `audit`. */
type AdminPage<T> = PaginatedResponse<T> & { audit?: T[] }

export interface AdminList<T> {
  items: T[] | null
  total: number
  hasMore: boolean
  /** Chargement de la page suivante (pas le premier chargement). */
  loadingMore: boolean
  refreshing: boolean
  error: string | null
  load: (page?: number, append?: boolean) => Promise<void>
  loadMore: () => void
  refresh: () => void
  /** Retouche locale après une écriture ponctuelle : évite de retomber sur la
   *  page 1 et de faire disparaître les pages déjà chargées. */
  patch: (fn: (prev: T[]) => T[]) => void
}

/** Liste admin paginée : premier chargement, page suivante, tiré-pour-rafraîchir
 *  et erreur récupérable. `items` reste `null` tant que rien n'est arrivé —
 *  c'est ce qui distingue « squelette » de « liste vide » et de « erreur ». */
export function useAdminList<T>(
  path: string,
  limit: number,
  select: (r: AdminPage<T>) => T[] = (r) => r.items,
): AdminList<T> {
  const [items, setItems] = useState<T[] | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    try {
      const sep = path.includes('?') ? '&' : '?'
      const r = await api<AdminPage<T>>('GET', `${path}${sep}page=${pageNum}&limit=${limit}`)
      const batch = select(r) ?? []
      setItems((prev) => (append && prev ? [...prev, ...batch] : batch))
      setPage(r.page)
      setTotal(r.total)
      setHasMore(r.hasMore)
      setError(null)
    } catch (e) {
      /* On garde ce qui est déjà à l'écran : un rafraîchissement raté n'efface
         pas la liste, il pose un bandeau. */
      setError(errMsg(e))
    } finally {
      setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, limit])

  useEffect(() => { load(1, false) }, [load])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) load(page + 1, true)
  }, [loadingMore, hasMore, page, load])

  const refresh = useCallback(() => {
    setRefreshing(true)
    load(1, false).finally(() => setRefreshing(false))
  }, [load])

  const patch = useCallback((fn: (prev: T[]) => T[]) => {
    setItems((prev) => (prev ? fn(prev) : prev))
  }, [])

  return { items, total, hasMore, loadingMore, refreshing, error, load, loadMore, refresh, patch }
}
