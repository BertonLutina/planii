import { useState } from 'react'
import {
  Pressable, StyleSheet, Text, TextInput, View,
  type KeyboardTypeOptions, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native'
import { Ic } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'

export interface FieldProps {
  /** Libellé au-dessus du champ — sert aussi de libellé d'accessibilité. */
  label?: string
  value?: string
  onChangeText?: (v: string) => void
  placeholder?: string
  /** Zone multiligne (hauteur minimale 80). */
  multiline?: boolean
  /** Message d'erreur : bordure et texte en `danger`. */
  error?: string | null
  /** Aide sous le champ (masquée si `error` est présent). */
  hint?: string
  maxLength?: number
  keyboardType?: KeyboardTypeOptions
  /** Ajoute un bouton œil pour révéler la saisie. */
  secureTextEntry?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoComplete?: 'off' | 'email' | 'password' | 'name' | 'new-password' | 'username'
  editable?: boolean
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send'
  onSubmitEditing?: () => void
  style?: StyleProp<ViewStyle>
  inputStyle?: StyleProp<TextStyle>
  testID?: string
}

export function Field({
  label, value, onChangeText, placeholder, multiline = false, error, hint,
  maxLength, keyboardType, secureTextEntry = false, autoCapitalize = 'sentences',
  autoComplete, editable = true, returnKeyType, onSubmitEditing, style, inputStyle, testID,
}: FieldProps) {
  const { c } = useTheme()
  const [focus, setFocus] = useState(false)
  const [reveal, setReveal] = useState(false)

  const border = error ? c.danger : focus ? c.accent : c.lineStrong

  return (
    <View style={[s.wrap, style]}>
      {!!label && <Text style={[s.label, { color: c.muted }]}>{label}</Text>}
      <View style={s.row}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.hint}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !reveal}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          accessibilityLabel={label ?? placeholder}
          accessibilityState={{ disabled: !editable }}
          style={[
            s.input,
            {
              backgroundColor: c.bg,
              borderColor: border,
              borderWidth: focus || error ? 1.5 : 1,
              color: c.text,
              opacity: editable ? 1 : 0.6,
              minHeight: multiline ? 80 : 46,
              paddingTop: multiline ? 12 : undefined,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingRight: secureTextEntry ? 46 : 13,
            },
            inputStyle,
          ]}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setReveal((r) => !r)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            accessibilityState={{ selected: reveal }}
            style={s.eye}
          >
            <Ic name={reveal ? 'eye-off' : 'eye'} s={18} c={c.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={[s.msg, { color: c.danger }]}>{error}</Text>}
      {!error && !!hint && <Text style={[s.msg, { color: c.hint }]}>{hint}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { position: 'relative', justifyContent: 'center' },
  input: {
    paddingHorizontal: 13, paddingVertical: 12,
    borderRadius: 11, fontSize: 16,
  },
  eye: { position: 'absolute', right: 6, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  msg: { fontSize: 12.5, marginTop: 5, fontWeight: '600' },
})
