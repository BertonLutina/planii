import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Chip } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'

export interface ChipOption<K extends string> {
  key: K
  label: string
  /** Ton sémantique ou sortie de `typeTone()`. */
  tone?: string
}

export interface ChipSelectProps<K extends string> {
  label?: string
  options: ChipOption<K>[]
  value: K
  onChange: (k: K) => void
  /** Fait défiler au lieu de passer à la ligne (longues listes de statuts). */
  scroll?: boolean
  style?: StyleProp<ViewStyle>
}

/** Choix unique par puces — remplace le `<select>` du web pour les listes
 *  courtes (type, priorité, statut). Manque du kit : `Chip` est unitaire. */
export function ChipSelect<K extends string>({
  label, options, value, onChange, scroll = false, style,
}: ChipSelectProps<K>) {
  const { c } = useTheme()
  const chips = options.map((o) => (
    <Chip
      key={o.key}
      label={o.label}
      tone={o.key === value ? (o.tone ?? 'accent') : 'neutral'}
      selected={o.key === value}
      onPress={() => onChange(o.key)}
    />
  ))

  return (
    <View style={[s.wrap, style]}>
      {!!label && <Text style={[s.label, { color: c.muted }]}>{label}</Text>}
      {scroll
        ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowScroll}>
            {chips}
          </ScrollView>
        )
        : <View style={s.row}>{chips}</View>}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rowScroll: { flexDirection: 'row', gap: 7, paddingRight: 18 },
})
