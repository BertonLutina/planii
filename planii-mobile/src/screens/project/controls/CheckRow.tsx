import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

export interface CheckRowProps {
  label: string
  sub?: string
  checked: boolean
  onPress: () => void
  /** `radio` pour un choix unique, `check` pour une sélection multiple. */
  mode?: 'check' | 'radio'
  /** Contenu à gauche (avatar, pastille de couleur). */
  left?: ReactNode
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

/** Rangée cochable (44 pt) — remplace `<input type="checkbox">` / `<select>`
 *  pour les listes de personnes, de rôles et de participants. Manque du kit. */
export function CheckRow({ label, sub, checked, onPress, mode = 'check', left, disabled, style }: CheckRowProps) {
  const { c } = useTheme()
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole={mode === 'radio' ? 'radio' : 'checkbox'}
      accessibilityLabel={sub ? `${label} — ${sub}` : label}
      accessibilityState={{ checked, disabled: !!disabled }}
      style={({ pressed }) => [
        s.row,
        { borderColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent', opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {!!left && <View style={s.left}>{left}</View>}
      <View style={s.body}>
        <Text numberOfLines={1} style={[s.label, { color: c.text }]}>{label}</Text>
        {!!sub && <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>{sub}</Text>}
      </View>
      <View
        style={[
          s.mark,
          {
            borderRadius: mode === 'radio' ? 11 : 6,
            borderColor: checked ? c.accent : c.lineStrong,
            backgroundColor: checked ? c.accent : 'transparent',
          },
        ]}
      >
        {checked && <Ic name="check" s={13} c={c.onAccent} strokeWidth={2.8} />}
      </View>
    </Pressable>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    minHeight: 50, paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderRadius: radius.small,
  },
  left: { flex: 0 },
  body: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12.5, marginTop: 2 },
  mark: { width: 22, height: 22, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
})
