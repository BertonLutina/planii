import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ic } from '@/components/Icon'
import { isoLocal, MONTHS, parseISO } from '@/lib/dates'
import { getLang, t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'

/* Saisie de date / d'heure — le kit n'a pas d'équivalent du `<input type="date">`
   du web. Même géométrie qu'un `Field` (46 pt, rayon 11, filet `lineStrong`)
   pour que les formulaires restent alignés.
   Android ouvre le sélecteur natif (dialogue système, pas une feuille : aucune
   modale empilée) ; iOS déplie une molette sous le champ, dans le flux. */

type Mode = 'date' | 'time'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Valeur ('AAAA-MM-JJ' ou 'HH:MM') → Date utilisable par le sélecteur natif. */
function toDate(mode: Mode, value?: string | null): Date {
  if (mode === 'date') return parseISO(value) ?? new Date()
  const [h, m] = String(value || '').split(':')
  const d = new Date()
  d.setHours(Number(h) || 9, Number(m) || 0, 0, 0)
  return d
}

/** Date choisie → valeur transmise à l'API (même format que le web). */
const fromDate = (mode: Mode, d: Date) => (mode === 'date' ? isoLocal(d) : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`)

/** Rendu lisible : « 12 sept. 2026 » ou « 14:30 ». */
function display(mode: Mode, value?: string | null): string {
  if (!value) return ''
  if (mode === 'time') return value
  const d = parseISO(value)
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ''
}

export interface DateTimeFieldProps {
  label: string
  /** 'AAAA-MM-JJ' en mode date, 'HH:MM' en mode heure. Chaîne vide = non renseigné. */
  value: string
  onChange: (v: string) => void
  mode?: Mode
  /** Texte affiché quand rien n'est choisi. */
  placeholder?: string
  /** Message d'erreur en ligne (jamais de toast pendant qu'une feuille est ouverte). */
  error?: string | null
  /** Ajoute une croix pour vider le champ (dates facultatives). */
  clearable?: boolean
  style?: StyleProp<ViewStyle>
}

export function DateTimeField({
  label, value, onChange, mode = 'date', placeholder, error, clearable = false, style,
}: DateTimeFieldProps) {
  const { c, dark } = useTheme()
  const [open, setOpen] = useState(false)
  const shown = display(mode, value)

  function commit(_e: DateTimePickerEvent, d?: Date) {
    setOpen(false)
    if (d) onChange(fromDate(mode, d))
  }

  function press() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(mode, value), mode, onChange: commit, is24Hour: true })
      return
    }
    setOpen((o) => !o)
  }

  return (
    <View style={[s.wrap, style]}>
      <Text style={[s.label, { color: c.muted }]}>{label}</Text>
      <View style={s.row}>
        <Pressable
          onPress={press}
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${shown || t('action.edit')}`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [
            s.box,
            {
              backgroundColor: pressed ? c.surface2 : c.bg,
              borderColor: error ? c.danger : open ? c.accent : c.lineStrong,
              borderWidth: error || open ? 1.5 : 1,
            },
          ]}
        >
          <Ic name={mode === 'date' ? 'calendar' : 'clock'} s={17} c={c.muted} />
          <Text numberOfLines={1} style={[s.value, { color: shown ? c.text : c.hint }]}>
            {shown || placeholder || '—'}
          </Text>
        </Pressable>
        {clearable && !!value && (
          <Pressable
            onPress={() => { setOpen(false); onChange('') }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`${t('action.remove')} ${label}`}
            style={[s.clear, { borderColor: c.line }]}
          >
            <Ic name="x" s={16} c={c.muted} strokeWidth={2.1} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={[s.msg, { color: c.danger }]}>{error}</Text>}
      {open && Platform.OS !== 'android' && (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          display="spinner"
          locale={getLang()}
          themeVariant={dark ? 'dark' : 'light'}
          onChange={commit}
        />
      )}
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
  value: { flex: 1, fontSize: 16 },
  clear: { width: 44, height: 44, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  msg: { fontSize: 12.5, marginTop: 5, fontWeight: '600' },
})
