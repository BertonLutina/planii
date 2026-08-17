import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Chip } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'

/* Remplace le `<select>` du web : une rangée de puces sélectionnables qui se
   replie sur plusieurs lignes. Pas de menu déroulant natif à ouvrir — donc
   jamais de modale par-dessus une feuille. */

export interface Choice<K extends string> {
  key: K
  label: string
  /** Ton de la puce quand elle est choisie (`accent` par défaut). */
  tone?: string
}

export interface ChoiceRowProps<K extends string> {
  label: string
  items: Choice<K>[]
  value: K
  onChange: (k: K) => void
  /** Message d'erreur en ligne. */
  error?: string | null
  style?: StyleProp<ViewStyle>
}

export function ChoiceRow<K extends string>({ label, items, value, onChange, error, style }: ChoiceRowProps<K>) {
  const { c } = useTheme()
  return (
    <View style={[s.wrap, style]}>
      <Text style={[s.label, { color: c.muted }]}>{label}</Text>
      <View style={s.row}>
        {items.map((it) => {
          const on = it.key === value
          return (
            <Chip
              key={it.key}
              label={it.label}
              tone={on ? (it.tone ?? 'accent') : 'neutral'}
              selected={on}
              onPress={() => onChange(it.key)}
              style={s.chip}
            />
          )
        })}
      </View>
      {!!error && <Text style={[s.msg, { color: c.danger }]}>{error}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  /* 34 pt de haut + 10 pt de marge tactile via le hitSlop de Chip. */
  chip: { paddingVertical: 8, paddingHorizontal: 12 },
  msg: { fontSize: 12.5, marginTop: 6, fontWeight: '600' },
})

/** Ton de puce d'une priorité 1–6 — même famille que `priorityColors`. */
export const prioTone = (n: number): string =>
  n === 1 ? 'danger' : n === 2 ? 'warn' : n === 3 ? 'accent' : n === 4 ? 'blue' : n === 5 ? 'ok' : 'neutral'
