import { useWindowDimensions } from 'react-native'
import type { ViewStyle } from 'react-native'

/** `Sheet` mesure sa hauteur sur son contenu : pour héberger une liste
 *  virtualisée il lui faut une hauteur ferme, et il faut neutraliser le
 *  `flex: 1` interne (qui vaudrait 0 dans un parent de hauteur automatique).
 *  À passer en `contentStyle` avec `scrollable={false}`. */
export function useSheetBody(ratio = 0.58, min = 320, max = 560): ViewStyle {
  const { height } = useWindowDimensions()
  const h = Math.round(Math.min(max, Math.max(min, height * ratio)))
  return { height: h, flexGrow: 0, flexShrink: 0, flexBasis: h }
}
