import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useRealtime } from '@/lib/realtime'
import type { PaginatedResponse, Project, Task } from '@/lib/types'
import { errMsg } from './flow'

const PAGE = 100

export interface ProjectData {
  p: Project | null
  /** Erreur bloquante du premier chargement. */
  err: string | null
  /** Premier chargement — l'écran affiche un squelette. */
  loading: boolean
  /** Recharge tout (après une écriture). */
  reload: () => void
  loadMoreTasks: () => void
  tasksHasMore: boolean
  tasksLoading: boolean
}

/** Chargement du projet — même séquence que le web : `GET /projects/:id` puis
 *  la première page de tâches, rafraîchi par le temps réel. */
export function useProjectData(id: string): ProjectData {
  const [p, setP] = useState<Project | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasksPage, setTasksPage] = useState(1)
  const [tasksHasMore, setTasksHasMore] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const alive = useRef(true)

  useEffect(() => () => { alive.current = false }, [])

  const loadTasks = useCallback(async (page: number, replace: boolean) => {
    setTasksLoading(true)
    try {
      const r = await api<PaginatedResponse<Task>>('GET', `/projects/${id}/tasks?page=${page}&limit=${PAGE}`)
      if (!alive.current) return
      setP((prev) => {
        if (!prev) return prev
        const merged = replace
          ? r.items
          : [...prev.tasks, ...r.items.filter((x) => !prev.tasks.some((y) => y.id === x.id))]
        return { ...prev, tasks: merged }
      })
      setTasksPage(r.page)
      setTasksHasMore(r.hasMore)
    } catch (e) {
      if (alive.current) setErr(errMsg(e))
    } finally {
      if (alive.current) setTasksLoading(false)
    }
  }, [id])

  const load = useCallback(async () => {
    try {
      const { project } = await api<{ project: Project }>('GET', '/projects/' + id)
      if (!alive.current) return
      setP((prev) => ({ ...project, tasks: prev?.tasks ?? [] }))
      setErr(null)
      await loadTasks(1, true)
    } catch (e) {
      if (alive.current) setErr(errMsg(e))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [id, loadTasks])

  useEffect(() => { load() }, [load])
  useRealtime((m) => { if (m.type === 'project' && m.projectId === id) load() })

  const loadMoreTasks = useCallback(() => {
    if (!tasksLoading && tasksHasMore) loadTasks(tasksPage + 1, false)
  }, [tasksLoading, tasksHasMore, tasksPage, loadTasks])

  return { p, err, loading, reload: load, loadMoreTasks, tasksHasMore, tasksLoading }
}
