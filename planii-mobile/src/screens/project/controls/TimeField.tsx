import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Button, Ic } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

export interface TimeFieldProps {
  label?: string
  /** Heure au format `HH:MM`. */
  value: string
  onChange: (v: string) => void
  editable?: boolean
  error?: string | null
  style?: StyleProp<ViewStyle>
}

const toDate = (v: string): Date => {
  const d = new Date()
  const [h, m] = v.split(':').map((x) => Number(x))
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0)
  return d
}
const fromDate = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Champ heure — sélecteur natif, jamais une saisie libre. Manque du kit. */
export function TimeField({ label, value, onChange, editable = true, error, style }: TimeFieldProps) {
  const { c, dark } = useTheme()
  const [open, setOpen] = useState(false)

  const onPick = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setOpen(false)
    if (e.type === 'dismissed' || !d) return
    onChange(fromDate(d))
  }

  return (
    <View style={[s.wrap, style]}>
      {!!label && <Text style={[s.label, { color: c.muted }]}>{label}</Text>}
      <Pressable
        onPress={() => editable && setOpen(true)}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? t('pd.slot')} : ${value}`}
        accessibilityState={{ disabled: !editable, expanded: open }}
        style={({ pressed }) => [
          s.box,
          {
            backgroundColor: pressed && editable ? c.surface2 : c.bg,
            borderColor: error ? c.danger : open ? c.accent : c.lineStrong,
            borderWidth: open || error ? 1.5 : 1,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        <Ic name="clock" s={17} c={c.muted} />
        <Text style={[s.value, { color: c.text }]}>{value || '--:--'}</Text>
      </Pressable>

      {open && (
        <View style={Platform.OS === 'ios' ? [s.ios, { borderColor: c.line, backgroundColor: c.surface }] : undefined}>
          <DateTimePicker
            value={toDate(value)}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPick}
            themeVariant={dark ? 'dark' : 'light'}
          />
          {Platform.OS === 'ios' && <Button label={t('action.done')} size="sm" onPress={() => setOpen(false)} />}
        </View>
      )}
      {!!error && <Text style={[s.msg, { color: c.danger }]}>{error}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: 46, paddingHorizontal: 13, borderRadius: 11,
  },
  value: { fontSize: 16, fontWeight: '600' },
  ios: { borderWidth: 1, borderRadius: radius.control, marginTop: 8, paddingBottom: 8, alignItems: 'center' },
  msg: { fontSize: 12.5, marginTop: 5, fontWeight: '600' },
})
