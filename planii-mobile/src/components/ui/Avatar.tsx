import { Image } from 'expo-image'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { initials } from '@/lib/dates'
import { useTheme } from '@/theme/ThemeProvider'

export interface AvatarProps {
  /** Nom complet — sert aux initiales et au libellé d'accessibilité. */
  name?: string
  /** Diamètre en points (34 par défaut). */
  size?: number
  /** URL absolue (passer par `mediaUrl()`). */
  src?: string | null
  style?: StyleProp<ViewStyle>
}

export function Avatar({ name, size = 34, src, style }: AvatarProps) {
  const { c } = useTheme()
  const box: StyleProp<ViewStyle> = [
    s.box,
    { width: size, height: size, borderRadius: size / 2, backgroundColor: src ? c.surface2 : c.accentBg },
    style,
  ]

  if (src) {
    return (
      <View style={box}>
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityLabel={name || undefined}
          transition={120}
        />
      </View>
    )
  }
  return (
    <View style={box} accessible accessibilityLabel={name || undefined}>
      <Text style={[s.txt, { color: c.accentOn, fontSize: Math.max(10, size / 2.6) }]}>{initials(name)}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: 0 },
  txt: { fontWeight: '700' },
})
