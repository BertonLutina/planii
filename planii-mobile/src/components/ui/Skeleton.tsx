import { useEffect } from 'react'
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { useReduceMotion } from './useReduceMotion'

export interface SkeletonProps {
  /** Largeur (100 % par défaut). */
  width?: DimensionValue
  /** Hauteur en points (14 par défaut). */
  height?: number
  /** Rayon (10 par défaut ; 99 pour un rond). */
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

/** Bloc de chargement. Le chargement est toujours un squelette calqué sur la
 *  mise en page finale, jamais un tourniquet. */
export function Skeleton({ width = '100%', height = 14, borderRadius = radius.small, style }: SkeletonProps) {
  const { c } = useTheme()
  const reduce = useReduceMotion()
  const o = useSharedValue(0.55)

  useEffect(() => {
    if (reduce) { o.value = 0.5; return }
    o.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [reduce, o])

  const anim = useAnimatedStyle(() => ({ opacity: o.value }))

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius, backgroundColor: c.surface2 }, anim, style]}
    />
  )
}

export interface SkeletonListProps {
  /** Nombre de lignes (4 par défaut). */
  count?: number
  /** Hauteur d'une ligne (68 par défaut — gabarit d'une carte de tâche). */
  itemHeight?: number
  /** Espacement vertical (11 par défaut). */
  gap?: number
  style?: StyleProp<ViewStyle>
}

/** Liste de squelettes : une carte par ligne, aux dimensions d'une vraie rangée. */
export function SkeletonList({ count = 4, itemHeight = 68, gap = 11, style }: SkeletonListProps) {
  const { c } = useTheme()
  return (
    <View accessibilityLabel="Chargement" accessibilityRole="progressbar" style={[{ gap }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[s.row, { height: itemHeight, backgroundColor: c.surface, borderColor: c.line }]}>
          <Skeleton width={22} height={22} borderRadius={11} />
          <View style={s.lines}>
            <Skeleton width="72%" height={14} />
            <Skeleton width="44%" height={11} />
          </View>
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 15,
  },
  lines: { flex: 1, gap: 8 },
})
