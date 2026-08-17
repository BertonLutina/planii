import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { Flag } from '@/components/Flag'
import { Ic } from '@/components/Icon'
import { Sheet } from '@/components/ui/Sheet'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

export interface SelectOption {
  value: string
  label: string
  /** Code ISO drapeau (fr, gb, …). */
  flag?: string
}

export interface SelectBoxProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string | null
  /** Affiche un champ de recherche dans la feuille. */
  searchable?: boolean
  style?: StyleProp<ViewStyle>
}

/** List box native : champ + feuille de choix (drapeaux inclus). */
export function SelectBox({
  label, value, options, onChange, placeholder, error, searchable = true, style,
}: SelectBoxProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return options
    return options.filter((o) =>
      o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle),
    )
  }, [options, q])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    setQ('')
  }

  return (
    <View style={[s.wrap, style]}>
      <Text style={[s.label, { color: c.muted }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={selected?.label || placeholder}
        style={({ pressed }) => [
          s.field,
          {
            backgroundColor: pressed ? c.surface2 : c.bg,
            borderColor: error ? c.danger : c.lineStrong,
          },
        ]}
      >
        {selected?.flag ? <Flag code={selected.flag} size={18} /> : null}
        <Text
          numberOfLines={1}
          style={[s.value, { color: selected ? c.text : c.hint, flex: 1 }]}
        >
          {selected?.label || placeholder || '—'}
        </Text>
        <Ic name="chevron-down" s={18} c={c.muted} />
      </Pressable>
      {!!error && <Text style={[s.err, { color: c.danger }]}>{error}</Text>}

      <Sheet
        open={open}
        onClose={() => { setOpen(false); setQ('') }}
        title={label}
        scrollable={false}
        contentStyle={s.sheetBody}
      >
        {searchable && (
          <View style={[s.search, { backgroundColor: c.bg, borderColor: c.lineStrong }]}>
            <Ic name="search" s={16} c={c.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('common.search')}
              placeholderTextColor={c.hint}
              autoCorrect={false}
              style={[s.searchInput, { color: c.text }]}
            />
          </View>
        )}
        <ScrollView style={s.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {filtered.map((o) => {
            const on = o.value === value
            return (
              <Pressable
                key={o.value}
                onPress={() => pick(o.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [
                  s.row,
                  { borderBottomColor: c.line },
                  pressed && { backgroundColor: c.surface2 },
                  on && { backgroundColor: c.accentSoft },
                ]}
              >
                {o.flag ? <Flag code={o.flag} size={20} /> : <View style={{ width: 28 }} />}
                <Text style={[s.rowLabel, { color: c.text, fontWeight: on ? '700' : '500' }]}>{o.label}</Text>
                {on && <Ic name="check" s={18} c={c.accent} strokeWidth={2.2} />}
              </Pressable>
            )
          })}
          {filtered.length === 0 && (
            <Text style={[s.empty, { color: c.hint }]}>Aucun résultat</Text>
          )}
        </ScrollView>
      </Sheet>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  field: {
    minHeight: 46, borderWidth: 1, borderRadius: radius.control,
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  value: { fontSize: 15 },
  err: { fontSize: 12.5, marginTop: 6, fontWeight: '600' },
  sheetBody: { paddingTop: 4, flex: 1 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: radius.control, paddingHorizontal: 12, minHeight: 42, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  list: { maxHeight: 420 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    minHeight: 50, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
})
