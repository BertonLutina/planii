import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import type { ReactNode } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, shadow } from '@/theme/tokens'

export interface CardProps {
  children?: ReactNode
  /** Rembourrage interne (16 par défaut, `false` pour coller le contenu aux bords). */
  padded?: boolean | number
  /** Rend la carte appuyable — ajoute le rôle bouton et l'état pressé. */
  onPress?: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function Card({ children, padded = true, onPress, accessibilityLabel, style, testID }: CardProps) {
  const { c } = useTheme()
  const padding = padded === false ? 0 : padded === true ? 16 : padded
  const base: StyleProp<ViewStyle> = [
    s.card,
    shadow,
    { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.shadowColor, padding },
    style,
  ]

  if (!onPress) return <View testID={testID} style={base}>{children}</View>

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { borderColor: c.lineStrong, backgroundColor: c.surface2 }]}
    >
      {children}
    </Pressable>
  )
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card },
})
