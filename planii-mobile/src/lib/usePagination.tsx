import { t as tt } from './i18n'
import { useCallback, useState } from 'react'
import { api } from './api'
import type { PaginatedResponse } from './types'

export function usePaginatedList<T>(path: string, limit = 30) {
  const [items, setItems] = useState<T[] | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true)
    try {
      const sep = path.includes('?') ? '&' : '?'
      const r = await api<PaginatedResponse<T>>('GET', `${path}${sep}page=${pageNum}&limit=${limit}`)
      setItems((prev) => (append && prev ? [...prev, ...r.items] : r.items))
      setPage(r.page)
      setTotal(r.total)
      setHasMore(r.hasMore)
    } finally {
      setLoading(false)
    }
  }, [path, limit])

  const loadMore = () => { if (!loading && hasMore) load(page + 1, true) }
  const reload = () => load(1, false)

  return { items, total, hasMore, loading, load, loadMore, reload }
}

export function LoadMoreButton({ hasMore, loading, loaded, total, onClick }: {
  hasMore: boolean; loading: boolean; loaded: number; total: number; onClick: () => void
}) {
  if (!hasMore) return null
  return (
    <div className="sheet-actions" style={{ marginTop: 12 }}>
      <button className="btn ghost" disabled={loading} onClick={onClick}>
        {loading ? tt('common.loading') : `${tt('common.loadMore')} (${loaded}/${total})`}
      </button>
    </div>
  )
}
