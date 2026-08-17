import { toast, toastErr } from '@/components/ui'

/* Le calque des toasts vit sous la fenêtre modale de React Native : un message
   émis pendant qu'une feuille est ouverte n'apparaît jamais. On ferme donc la
   feuille d'abord, et on laisse passer son animation de sortie avant d'afficher
   la confirmation. */

const DELAY = 340

/** Confirmation à afficher juste après la fermeture d'une feuille. */
export const toastAfterSheet = (text: string): void => { setTimeout(() => toast(text), DELAY) }

/** Erreur à afficher juste après la fermeture d'une feuille. */
export const toastErrAfterSheet = (text: string): void => { setTimeout(() => toastErr(text), DELAY) }
