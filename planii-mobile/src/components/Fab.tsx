import * as Haptics from 'expo-haptics'
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ic, type IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'

export interface FabProps {
  onPress: () => void
  /** Décrit l'action, pas l'icône : « Nouveau projet ». Obligatoire. */
  accessibilityLabel: string
  /** Icône (défaut : `plus`). */
  icon?: IconName | (string & {})
  /** Hauteur de la barre d'onglets à franchir (56 par défaut). Passez 0 sur un
   *  écran de pile sans onglets. */
  tabBarHeight?: number
  style?: StyleProp<ViewStyle>
}

/** Bouton d'action flottant (`.fab`) : cercle accent 56 pt, en bas à droite,
 *  au-dessus de la barre d'onglets et de l'encoche basse. */
export function Fab({ onPress, accessibilityLabel, icon = 'plus', tabBarHeight = 56, style }: FabProps) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { /* ignore */ })
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        s.fab,
        {
          backgroundColor: pressed ? c.accent2 : c.accent,
          shadowColor: c.accent,
          bottom: insets.bottom + tabBarHeight + 18,
        },
        style,
      ]}
    >
      <Ic name={icon} s={26} c={c.onAccent} strokeWidth={2.4} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute', right: 18,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 6,
  },
})

export default Fab
