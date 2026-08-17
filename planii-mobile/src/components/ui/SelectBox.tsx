import { useMemo, useState } from 'react'
import {
  LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, UIManager, View,
  type StyleProp, type ViewStyle,
} from 'react-native'
import { Flag } from '@/components/Flag'
import { Ic } from '@/components/Icon'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export interface SelectOption {
  value: string
  label: string
  /** Seconde ligne, en plus discret — nom natif, précision, contexte. */
  hint?: string
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
  /** Affiche un champ de recherche au-dessus de la liste. */
  searchable?: boolean
  /** Au-delà, la liste défile au lieu de pousser la page. */
  maxListHeight?: number
  style?: StyleProp<ViewStyle>
}

/**
 * List box déroulante — le champ s'ouvre sur place, la liste vient s'accrocher
 * dessous.
 *
 * Pas de modale : une boîte flottante coupe le lien entre le contrôle et son
 * choix, et sur mobile elle recouvre le formulaire qu'on est en train de
 * remplir. Ici la liste reste attachée à son champ, comme un `<select>` ouvert.
 */
export function SelectBox({
  label, value, options, onChange, placeholder, error,
  searchable = false, maxListHeight = 420, style,
}: SelectBoxProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return options
    return options.filter((o) =>
      o.label.toLowerCase().includes(needle)
      || (o.hint || '').toLowerCase().includes(needle)
      || o.value.toLowerCase().includes(needle),
    )
  }, [options, q])

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((v) => !v)
    setQ('')
  }

  function pick(v: string) {
    onChange(v)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen(false)
    setQ('')
  }

  return (
    <View style={[s.wrap, style]}>
      <Text style={[s.label, { color: c.muted }]}>{label}</Text>

      {/* Champ fermé — ou tête du déroulant quand il est ouvert. */}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={selected?.label || placeholder}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          s.field,
          open && s.fieldOpen,
          {
            backgroundColor: pressed ? c.surface2 : c.bg,
            borderColor: error ? c.danger : open ? c.accentOn : c.lineStrong,
          },
        ]}
      >
        {selected?.flag ? <Flag code={selected.flag} size={18} /> : null}
        <Text numberOfLines={1} style={[s.value, { color: selected ? c.text : c.hint }]}>
          {selected?.label || placeholder || '—'}
        </Text>
        <Ic name={open ? 'chevron-up' : 'chevron-down'} s={18} c={c.muted} />
      </Pressable>

      {open && (
        <View style={[s.list, { borderColor: c.accentOn, backgroundColor: c.surface }]}>
          {searchable && (
            <View style={[s.search, { backgroundColor: c.bg, borderColor: c.lineStrong }]}>
              <Ic name="search" s={16} c={c.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={t('common.search')}
                placeholderTextColor={c.hint}
                autoCorrect={false}
                autoFocus
                style={[s.searchInput, { color: c.text }]}
              />
            </View>
          )}

          {/* `maxHeight` seul suffit : le ScrollView épouse son contenu tant
              qu'il tient, et ne défile qu'au-delà. */}
          <ScrollView
            style={{ maxHeight: maxListHeight }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {filtered.map((o, i) => {
              const on = o.value === value
              return (
                <Pressable
                  key={o.value}
                  onPress={() => pick(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [
                    s.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
                    pressed && { backgroundColor: c.surface2 },
                    on && { backgroundColor: c.accentBg },
                  ]}
                >
                  {o.flag ? <Flag code={o.flag} size={20} /> : <View style={{ width: 28 }} />}
                  <View style={s.rowText}>
                    <Text style={[s.rowLabel, { color: c.text, fontWeight: on ? '700' : '600' }]}>
                      {o.label}
                    </Text>
                    {!!o.hint && (
                      <Text numberOfLines={1} style={[s.rowHint, { color: c.hint }]}>{o.hint}</Text>
                    )}
                  </View>
                  {on && <Ic name="check" s={18} c={c.accent} strokeWidth={2.4} />}
                </Pressable>
              )
            })}
            {filtered.length === 0 && (
              <Text style={[s.empty, { color: c.hint }]}>Aucun résultat</Text>
            )}
          </ScrollView>
        </View>
      )}

      {!!error && <Text style={[s.err, { color: c.danger }]}>{error}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  field: {
    minHeight: 48, borderWidth: 1, borderRadius: radius.control,
    paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  // Ouvert : la tête perd ses coins bas pour se souder à la liste.
  fieldOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  value: { flex: 1, fontSize: 15.5, fontWeight: '600' },
  list: {
    borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: radius.control, borderBottomRightRadius: radius.control,
    overflow: 'hidden',
  },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.control,
    paddingHorizontal: 12, minHeight: 42, margin: 10, marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 56, paddingHorizontal: 13 },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 15.5, letterSpacing: -0.2 },
  rowHint: { fontSize: 12.5, marginTop: 1 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  err: { fontSize: 12.5, marginTop: 6, fontWeight: '600' },
})
