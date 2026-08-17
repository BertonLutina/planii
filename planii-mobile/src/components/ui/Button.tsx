import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic, type IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps {
  /** Libellé — français, casse de phrase. */
  label: string
  onPress?: () => void
  /** `primary` : une seule par écran. */
  variant?: ButtonVariant
  size?: ButtonSize
  /** Pleine largeur. */
  block?: boolean
  /** Remplace l'icône par un indicateur et bloque l'appui. */
  loading?: boolean
  disabled?: boolean
  /** Icône en tête de libellé. */
  icon?: IconName | (string & {})
  /** Par défaut : le libellé. */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function Button({
  label, onPress, variant = 'secondary', size = 'md', block = false,
  loading = false, disabled = false, icon, accessibilityLabel, style, testID,
}: ButtonProps) {
  const { c } = useTheme()
  const off = disabled || loading

  const bg = variant === 'primary' ? c.accent : variant === 'ghost' ? 'transparent' : c.surface
  const bgPressed = variant === 'primary' ? c.accent2 : c.surface2
  const border = variant === 'primary' ? c.accent : variant === 'danger' ? c.danger : variant === 'ghost' ? 'transparent' : c.lineStrong
  const fg = variant === 'primary' ? c.onAccent : variant === 'danger' ? c.danger : c.text

  const pad = size === 'sm' ? { paddingVertical: 9, paddingHorizontal: 12 } : { paddingVertical: 12, paddingHorizontal: 16 }

  return (
    <Pressable
      testID={testID}
      onPress={off ? undefined : onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy: loading }}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        s.base,
        pad,
        {
          backgroundColor: pressed && !off ? bgPressed : bg,
          borderColor: border,
          borderRadius: size === 'sm' ? radius.small : radius.control,
          minHeight: size === 'sm' ? 38 : 46,
          opacity: off ? 0.5 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
          width: block ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={fg} />
        : icon
          ? <View style={s.icon}><Ic name={icon} s={size === 'sm' ? 15 : 17} c={fg} /></View>
          : null}
      <Text numberOfLines={1} style={[s.label, { color: fg, fontSize: size === 'sm' ? 13 : 14.5 }]}>{label}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  icon: { flex: 0 },
  label: { fontWeight: '700', letterSpacing: -0.1, flexShrink: 1 },
})
