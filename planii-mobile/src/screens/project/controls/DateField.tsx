import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Button, Ic } from '@/components/ui'
import { MONTHS, isoLocal, parseISO } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

export interface DateFieldProps {
  label?: string
  /** Date au format `YYYY-MM-DD`, ou chaîne vide. */
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string | null
  hint?: string
  /** Autorise le retour à « aucune date » (défaut : oui). */
  clearable?: boolean
  editable?: boolean
  style?: StyleProp<ViewStyle>
}

const pretty = (v: string): string => {
  const d = parseISO(v)
  if (!d) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Champ date — jamais une saisie libre : le sélecteur natif de la plateforme.
 *  Manque du kit : `Field` ne couvre que le texte. */
export function DateField({
  label, value, onChange, placeholder, error, hint,
  clearable = true, editable = true, style,
}: DateFieldProps) {
  const { c, dark } = useTheme()
  const [open, setOpen] = useState(false)
  const current = parseISO(value) ?? new Date()

  const onPick = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setOpen(false)
    if (e.type === 'dismissed' || !d) return
    onChange(isoLocal(d))
  }

  const border = error ? c.danger : c.lineStrong

  return (
    <View style={[s.wrap, style]}>
      {!!label && <Text style={[s.label, { color: c.muted }]}>{label}</Text>}
      <View style={s.row}>
        <Pressable
          onPress={() => editable && setOpen(true)}
          disabled={!editable}
          accessibilityRole="button"
          accessibilityLabel={`${label ?? t('td.due')} : ${value ? pretty(value) : (placeholder ?? '—')}`}
          accessibilityState={{ disabled: !editable, expanded: open }}
          style={({ pressed }) => [
            s.box,
            {
              backgroundColor: pressed && editable ? c.surface2 : c.bg,
              borderColor: open ? c.accent : border,
              borderWidth: open || error ? 1.5 : 1,
              opacity: editable ? 1 : 0.6,
            },
          ]}
        >
          <Ic name="calendar" s={17} c={c.muted} />
          <Text numberOfLines={1} style={[s.value, { color: value ? c.text : c.hint }]}>
            {value ? pretty(value) : (placeholder ?? '—')}
          </Text>
        </Pressable>
        {clearable && !!value && editable && (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('action.remove')}
            style={s.clear}
          >
            <Ic name="x" s={16} c={c.muted} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      {open && (
        <View style={Platform.OS === 'ios' ? [s.ios, { borderColor: c.line, backgroundColor: c.surface }] : undefined}>
          <DateTimePicker
            value={current}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPick}
            themeVariant={dark ? 'dark' : 'light'}
          />
          {Platform.OS === 'ios' && (
            <Button label={t('action.done')} size="sm" onPress={() => setOpen(false)} style={s.done} />
          )}
        </View>
      )}

      {!!error && <Text style={[s.msg, { color: c.danger }]}>{error}</Text>}
      {!error && !!hint && <Text style={[s.msg, { color: c.hint }]}>{hint}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: 46, paddingHorizontal: 13, borderRadius: 11,
  },
  value: { fontSize: 16, flex: 1 },
  clear: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  ios: { borderWidth: 1, borderRadius: radius.control, marginTop: 8, paddingBottom: 8, alignItems: 'center' },
  done: { alignSelf: 'center' },
  msg: { fontSize: 12.5, marginTop: 5, fontWeight: '600' },
})
