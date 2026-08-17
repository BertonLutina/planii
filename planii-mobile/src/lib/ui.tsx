/* Équivalents mobiles des aides de `planii-vite/src/lib/ui.tsx`, pour que le
   code d'écran se porte à l'identique :
     import { Avatar, toast, toastErr, Modal, health } from '@/lib/ui'
   `Modal` est la feuille du bas — la modale centrée du web n'a pas de sens ici. */

import { light } from '@/theme/tokens'

export { Avatar } from '@/components/ui/Avatar'
export { toast, toastErr } from '@/components/ui/Toast'
export { Sheet as Modal, type SheetProps as ModalProps } from '@/components/ui/Sheet'

export interface Health {
  /** Pourcentage d'avancement, plancher à 6 % dès qu'une tâche est faite. */
  pct: number
  done: number
  total: number
  /** Clé de couleur du thème : `ok` pour un projet clôturé, `accent` sinon.
   *  Résolvez-la avec `useTheme().c[h.color]`. */
  color: 'ok' | 'accent'
}

/** Santé d'un projet — même calcul que le web. */
export function health(taskCount: number, doneCount: number, status?: string): Health {
  const pct = taskCount ? Math.round((doneCount / taskCount) * 100) : 0
  return {
    pct: Math.max(pct, doneCount ? 6 : 0),
    done: doneCount,
    total: taskCount,
    color: status === 'done' ? 'ok' : 'accent',
  }
}

/** Clés de couleur acceptées par `health().color` — garde-fou de typage. */
export type HealthColorKey = keyof Pick<typeof light, 'ok' | 'accent'>
