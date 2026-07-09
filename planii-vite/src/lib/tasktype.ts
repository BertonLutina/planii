import type { User } from './types'

export const DEFAULT_TASK_TYPES = ['Tâche', 'Bug']

/** Liste des types de tâches de l'utilisateur (défaut : Tâche, Bug). */
export function taskTypesOf(u?: User | null): string[] {
  return u && Array.isArray(u.taskTypes) && u.taskTypes.length ? u.taskTypes : DEFAULT_TASK_TYPES
}

/** Bibliothèque de rôles réutilisables de l'utilisateur (peut être vide). */
export function roleLibraryOf(u?: User | null): string[] {
  return u && Array.isArray(u.roleLibrary) ? u.roleLibrary : []
}

/** Métadonnées d'affichage d'un type de tâche (couleur stable par nom). */
const TONES = ['tt-a', 'tt-b', 'tt-c', 'tt-d', 'tt-e']
export function typeTone(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}
