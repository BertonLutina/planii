import { toast, toastErr } from '@/components/ui'

/* Une feuille React Native est une vraie fenêtre modale : elle recouvre le
   calque des toasts, et en ouvrir une seconde par-dessus la première fige
   l'animation sur iOS. On ferme donc toujours avant, et on laisse passer
   l'animation de sortie. */

/** Durée de l'animation de sortie d'une feuille. */
export const SHEET_EXIT = 320

/** Enchaîne une action (ouvrir une autre feuille) après la fermeture. */
export const afterSheet = (fn: () => void): void => { setTimeout(fn, SHEET_EXIT) }

/** Confirmation à afficher juste après la fermeture d'une feuille. */
export const toastAfterSheet = (text: string): void => { setTimeout(() => toast(text), SHEET_EXIT) }

/** Erreur à afficher juste après la fermeture d'une feuille. */
export const toastErrAfterSheet = (text: string): void => { setTimeout(() => toastErr(text), SHEET_EXIT) }

/** Message d'erreur lisible d'une exception d'API. */
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))
