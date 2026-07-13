import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { Project, ProjectSummary } from './types'

/** Résumés des projets (une seule requête). */
export function useProjectSummaries() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const { projects: sums } = await api<{ projects: ProjectSummary[] }>('GET', '/projects')
      setProjects(sums)
      setError(null)
    } catch (e: any) { setError(e.message); setProjects([]) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { projects, error, reload }
}

/** Mes tâches assignées, groupées par projet (une seule requête). */
export function useMyTasks() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const { projects: data } = await api<{ projects: Project[] }>('GET', '/tasks/mine')
      setProjects(data)
      setError(null)
    } catch (e: any) { setError(e.message); setProjects([]) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { projects, error, reload }
}

/** @deprecated Préférer useProjectSummaries ou useMyTasks selon le besoin. */
export function useAllProjects() {
  return useMyTasks()
}
