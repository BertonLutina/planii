import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { Project, ProjectSummary } from './types'

/** Charge tous les projets de l'utilisateur avec leurs détails (membres, tâches…). */
export function useAllProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const { projects: sums } = await api<{ projects: ProjectSummary[] }>('GET', '/projects')
      const full: Project[] = []
      for (const s of sums) {
        const { project } = await api<{ project: Project }>('GET', '/projects/' + s.id)
        full.push(project)
      }
      setProjects(full)
    } catch (e: any) { setError(e.message); setProjects([]) }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { projects, error, reload }
}
