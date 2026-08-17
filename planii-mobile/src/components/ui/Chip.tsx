import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic } from '@/components/Icon'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { resolveTone, toneColors, type Tone, type TypeTone } from './tone'

export interface ChipProps {
  label: string
  /** Ton sémantique ou sortie de `typeTone()` ('tt-a'…'tt-e'). Défaut : neutre. */
  tone?: Tone | TypeTone | (string & {})
  /** Rend la puce appuyable. */
  onPress?: () => void
  /** Affiche une croix de retrait (zone tactile 44 pt propre). */
  onRemove?: () => void
  /** Coche l'état sélectionné (bordure pleine). */
  selected?: boolean
  style?: StyleProp<ViewStyle>
}

export function Chip({ label, tone, onPress, onRemove, selected = false, style }: ChipProps) {
  const { c } = useTheme()
  const tc = toneColors(c, resolveTone(tone))
  const neutral = resolveTone(tone) === 'neutral'

  const body = (
    <>
      <Text numberOfLines={1} style={[s.label, { color: neutral ? c.muted : tc.fg }]}>{label}</Text>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('action.remove')} ${label}`}
          style={s.x}
        >
          <Ic name="x" s={13} c={neutral ? c.muted : tc.fg} strokeWidth={2.2} />
        </Pressable>
      )}
    </>
  )

  const box: StyleProp<ViewStyle> = [
    s.chip,
    {
      backgroundColor: neutral ? c.surface2 : tc.bg,
      borderColor: selected ? tc.border : neutral ? c.line : tc.border,
      borderWidth: selected ? 1.5 : 1,
    },
    style,
  ]

  if (!onPress) return <View style={box}>{body}</View>
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 10, bottom: 10 }}
      style={({ pressed }) => [box, pressed && { backgroundColor: c.surface2 }]}
    >
      {body}
    </Pressable>
  )
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: radius.pill, alignSelf: 'flex-start', maxWidth: '100%',
  },
  label: { fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
  x: { marginRight: -2 },
})
