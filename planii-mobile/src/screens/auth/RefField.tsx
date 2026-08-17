import { forwardRef, useState } from 'react'
import {
  Pressable, StyleSheet, Text, TextInput, View,
  type KeyboardTypeOptions, type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native'
import { Ic } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'

/* Champ de saisie du formulaire de connexion.
   Même contrat visuel que `Field` du kit (libellé 13/600, hauteur 46, rayon 11,
   saisie 16 px pour éviter le zoom iOS, bordure `accent` au focus / `danger` en
   erreur) — mais il transmet une `ref` au `TextInput`.
   Raison : `Field` n'expose pas de ref, donc impossible d'enchaîner les champs
   au clavier (« suivant » → champ suivant), ce que l'écran de connexion exige.
   À supprimer dès que le kit acceptera une ref. */

export interface RefFieldProps {
  label?: string
  value?: string
  onChangeText?: (v: string) => void
  placeholder?: string
  /** Message d'erreur : bordure et texte en `danger`. */
  error?: string | null
  /** Aide sous le champ (masquée si `error` est présent). */
  hint?: string
  maxLength?: number
  keyboardType?: KeyboardTypeOptions
  /** Ajoute un bouton œil pour révéler la saisie. */
  secureTextEntry?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoComplete?: TextInputProps['autoComplete']
  textContentType?: TextInputProps['textContentType']
  autoCorrect?: boolean
  editable?: boolean
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: () => void
  blurOnSubmit?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

export const RefField = forwardRef<TextInput, RefFieldProps>(function RefField({
  label, value, onChangeText, placeholder, error, hint, maxLength, keyboardType,
  secureTextEntry = false, autoCapitalize = 'sentences', autoComplete, textContentType,
  autoCorrect, editable = true, returnKeyType, onSubmitEditing, blurOnSubmit,
  style, testID,
}, ref) {
  const { c } = useTheme()
  const [focus, setFocus] = useState(false)
  const [reveal, setReveal] = useState(false)

  const border = error ? c.danger : focus ? c.accent : c.lineStrong

  return (
    <View style={[s.wrap, style]}>
      {!!label && <Text style={[s.label, { color: c.muted }]}>{label}</Text>}
      <View style={s.row}>
        <TextInput
          ref={ref}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.hint}
          maxLength={maxLength}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !reveal}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCorrect={autoCorrect}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={blurOnSubmit === false ? 'submit' : 'blurAndSubmit'}
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
              paddingRight: secureTextEntry ? 46 : 13,
            },
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
})

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { position: 'relative', justifyContent: 'center' },
  input: {
    paddingHorizontal: 13, paddingVertical: 12,
    borderRadius: 11, fontSize: 16, minHeight: 46,
  },
  eye: { position: 'absolute', right: 6, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  msg: { fontSize: 12.5, marginTop: 5, fontWeight: '600' },
})
