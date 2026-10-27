import { AccessibilityInfo } from 'react-native'

/** Socle a11y mobile (PLANI-016).
 *  Parcours cibles : Auth, Projets, Agenda, Tâche.
 *  Chaque contrôle exposé doit avoir nom, rôle, état et action.
 *  Couleur, geste et voix ont toujours une alternative (clavier/bouton/texte). */

export const A11Y_FLOWS = ['auth', 'projects', 'agenda', 'task'] as const
export type A11yFlow = (typeof A11Y_FLOWS)[number]

export function announce(message: string): void {
  const text = message.trim()
  if (!text) return
  AccessibilityInfo.announceForAccessibility(text)
}
