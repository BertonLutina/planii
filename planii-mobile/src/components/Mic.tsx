import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Animated, Easing, Linking, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Banner, Button, Ic, useReduceMotion, type FieldProps } from '@/components/ui'
import { t } from '@/lib/i18n'
import { listen, speechSupported, type Recognizer, type SpeechError } from '@/lib/speech'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Dictée — portage de `planii-vite/src/components/Mic.tsx`
   (`Mic`, `MicInput`, `MicTextarea`).

   Trois écarts assumés avec le web :

   1. Le web masque le micro quand `speechSupported()` est faux. Ici la même
      règle couvre un cas de plus : sous Expo Go la partie native de
      `expo-speech-recognition` n'existe pas. `MicField` redevient alors un
      champ ordinaire, sans bouton mort ni message.
   2. Le web n'a pas d'autorisation à demander (le navigateur s'en charge). En
      natif elle se demande au premier appui, jamais au démarrage, et un refus
      s'affiche en ligne — sous une feuille ouverte un toast serait invisible.
      Un refus définitif propose l'ouverture des réglages système.
   3. L'état d'enregistrement du web (`.mic-btn.on`) est un fond `--danger-bg`
      avec une pastille qui pulse. Repris tel quel (`dangerBg` + `dangerOn`),
      avec en plus la transcription en cours sous le champ : sur un téléphone
      l'utilisateur doit voir que le micro l'écoute vraiment. L'anneau qui pulse
      se fige si l'utilisateur a demandé moins d'animations. */

/** Refus temporaire, refus définitif, ou panne du moteur. */
export type MicIssue = 'denied' | 'blocked' | 'error'

/** Boîte de dialogue système de dernier recours : elle n'est pas une feuille,
 *  elle peut donc s'ouvrir par-dessus une feuille sans l'empiler. */
function askSettings() {
  Alert.alert(t('vw.noVoice'), undefined, [
    { text: t('action.cancel'), style: 'cancel' },
    { text: t('cmd.open') + 'Planii', onPress: () => { Linking.openSettings().catch(() => { /* noop */ }) } },
  ])
}

/* ---------- moteur partagé ---------- */

interface Dictation {
  supported: boolean
  rec: boolean
  heard: string
  issue: MicIssue | null
  clearIssue: () => void
  toggle: () => void
}

/** Écoute + ajout au texte existant (append), comme le web. */
function useDictation(value: string, onChange: (v: string) => void, onIssue?: (i: MicIssue) => void): Dictation {
  const [supported] = useState(speechSupported)
  const [rec, setRec] = useState(false)
  const [heard, setHeard] = useState('')
  const [issue, setIssue] = useState<MicIssue | null>(null)

  const ref = useRef<Recognizer | null>(null)
  const base = useRef('')
  const alive = useRef(true)
  /* Le texte et le récepteur changent à chaque frappe : on les lit au moment
     de l'appui, pas au moment où l'écouteur a été créé. */
  const valueRef = useRef(value)
  const changeRef = useRef(onChange)
  const issueRef = useRef(onIssue)
  valueRef.current = value
  changeRef.current = onChange
  issueRef.current = onIssue

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; ref.current?.abort() }
  }, [])

  const raise = useCallback((i: MicIssue) => {
    if (issueRef.current) issueRef.current(i)
    else setIssue(i)
  }, [])

  const toggle = useCallback(() => {
    if (rec) { ref.current?.stop(); return }
    const start = valueRef.current ? valueRef.current.replace(/\s+$/, '') + ' ' : ''
    base.current = start
    setIssue(null)
    setHeard('')
    setRec(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { /* noop */ })

    listen({
      onText: (txt) => {
        setHeard(txt)
        changeRef.current((base.current + txt).replace(/\s+/g, ' ').replace(/^\s+/, ''))
      },
      onEnd: () => {
        if (!alive.current) return
        setRec(false)
        setHeard('')
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { /* noop */ })
      },
      onError: (e: SpeechError) => {
        if (!alive.current) return
        setRec(false)
        setHeard('')
        if (e === 'blocked') raise('blocked')
        else if (e === 'not-allowed') raise('denied')
        else if (e !== 'unsupported') raise('error')
      },
    }).then((r) => {
      /* Démonté ou arrêté pendant la demande d'autorisation : on relâche le
         micro tout de suite plutôt que de le laisser ouvert. */
      if (!alive.current) { r?.abort(); return }
      ref.current = r
      if (!r) setRec(false)
    })
  }, [rec, raise])

  return { supported, rec, heard, issue, clearIssue: () => setIssue(null), toggle }
}

/* ---------- bouton ---------- */

export interface MicProps {
  value: string
  onChange: (v: string) => void
  /** Libellé d'accessibilité — défaut « Dicter une tâche ». */
  label?: string
  /** Côté de la boîte visible (défaut 44 pt). Le `hitSlop` complète la cible. */
  size?: number
  disabled?: boolean
  /** Remonte un refus à l'appelant, qui l'affiche à sa façon (bandeau en
   *  ligne). Sans ce rappel, une alerte système propose les réglages. */
  onIssue?: (i: MicIssue) => void
  style?: StyleProp<ViewStyle>
}

/** Bouton micro à poser à côté d'un composeur libre (commentaires, réunion).
 *  Ne rend rien quand la reconnaissance est indisponible. */
export function Mic({ value, onChange, label, size = 44, disabled = false, onIssue, style }: MicProps) {
  const d = useDictation(value, onChange, onIssue ?? ((i) => { if (i === 'blocked') askSettings() }))
  if (!d.supported) return null
  return (
    <MicButton
      rec={d.rec}
      size={size}
      round
      disabled={disabled}
      label={label ?? t('pd.dictate')}
      onPress={d.toggle}
      style={style}
    />
  )
}

/* ---------- champ + micro ---------- */

export interface MicFieldProps extends Omit<FieldProps, 'secureTextEntry'> {
  /** Libellé d'accessibilité du micro (défaut « Dicter une tâche »). */
  micLabel?: string
}

/** Champ texte avec micro intégré — l'équivalent de `MicInput` du web.
 *
 *  Manque du kit : `Field` n'expose ni emplacement à droite ni `ref`, et son
 *  seul bouton interne (l'œil des mots de passe) n'est pas ouvert. La ligne de
 *  saisie est donc reconstruite ici avec **exactement** les mêmes jetons que
 *  `Field` (rayon 11, corps 16, hauteur 46 / 80 en multiligne, bordure 1 puis
 *  1.5 au focus, message 12.5) — même contrat visuel, plus la gouttière du
 *  micro et la transcription en cours. */
export function MicField({
  label, value = '', onChangeText, placeholder, multiline = false, error, hint,
  maxLength, keyboardType, autoCapitalize = 'sentences', autoComplete, editable = true,
  returnKeyType, onSubmitEditing, style, inputStyle, testID, micLabel,
}: MicFieldProps) {
  const { c } = useTheme()
  const [focus, setFocus] = useState(false)
  const change = onChangeText ?? (() => { /* champ en lecture seule */ })
  const d = useDictation(value, change)

  const border = error ? c.danger : d.rec ? c.danger : focus ? c.accent : c.lineStrong
  const showMic = d.supported && editable

  return (
    <View style={[s.wrap, style]}>
      {!!label && <Text style={[s.label, { color: c.muted }]}>{label}</Text>}

      <View style={s.row}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={change}
          placeholder={placeholder}
          placeholderTextColor={c.hint}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
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
              borderWidth: focus || error || d.rec ? 1.5 : 1,
              color: c.text,
              opacity: editable ? 1 : 0.6,
              minHeight: multiline ? 80 : 46,
              paddingTop: multiline ? 12 : undefined,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingRight: showMic ? 50 : 13,
            },
            inputStyle,
          ]}
        />
        {showMic && (
          <MicButton
            rec={d.rec}
            size={38}
            label={micLabel ?? t('pd.dictate')}
            onPress={d.toggle}
            style={[s.inset, multiline ? s.insetTop : s.insetMid]}
          />
        )}
      </View>

      {/* Preuve d'écoute : l'état ne tient jamais dans la seule couleur. */}
      {d.rec && (
        <View
          accessibilityLiveRegion="polite"
          style={[s.heard, { backgroundColor: c.dangerBg }]}
        >
          <Text numberOfLines={2} style={[s.heardTxt, { color: c.dangerOn }]}>
            {t('vw.listening')}{d.heard ? ` « ${d.heard} »` : ''}
          </Text>
        </View>
      )}

      {!!error && <Text style={[s.msg, { color: c.danger }]}>{error}</Text>}
      {!error && !!hint && <Text style={[s.msg, { color: c.hint }]}>{hint}</Text>}

      {/* Refus : jamais d'impasse — on explique, et on ouvre la route. */}
      {!!d.issue && (
        <View style={s.issue}>
          <Banner tone="warn" icon="alert" text={t('vw.noVoice')} />
          {d.issue === 'blocked' && (
            <Button
              label={t('cmd.open') + 'Planii'}
              icon="settings"
              size="sm"
              onPress={() => { Linking.openSettings().catch(() => { /* noop */ }); d.clearIssue() }}
              style={s.issueBtn}
            />
          )}
        </View>
      )}
    </View>
  )
}

/** Zone de texte avec micro — l'équivalent de `MicTextarea` du web. */
export function MicTextArea(props: MicFieldProps) {
  return <MicField {...props} multiline />
}

/* ---------- rendu du bouton ---------- */

export interface MicButtonProps {
  /** État d'écoute — fond `dangerBg`, anneau qui pulse, `selected` annoncé. */
  rec: boolean
  /** Côté de la boîte visible ; le `hitSlop` complète les 44 pt. */
  size: number
  label: string
  onPress: () => void
  round?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

/** Bouton micro nu — utilisé tel quel par l'assistant vocal guidé. */
export function MicButton({ rec, size, label, onPress, round = false, disabled = false, style }: MicButtonProps) {
  const { c } = useTheme()
  const reduce = useReduceMotion()
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!rec || reduce) { pulse.setValue(0); return }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true,
      }),
    )
    loop.start()
    return () => { loop.stop(); pulse.setValue(0) }
  }, [rec, reduce, pulse])

  const br = round ? size / 2 : radius.small
  const bg = rec ? c.dangerBg : c.surface
  const fg = rec ? c.dangerOn : c.muted

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={Math.max(0, Math.round((44 - size) / 2)) + 6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: rec, disabled }}
      style={({ pressed }) => [
        s.btn,
        {
          width: size,
          height: size,
          borderRadius: br,
          backgroundColor: pressed && !rec ? c.surface2 : bg,
          borderColor: rec ? c.dangerOn : c.lineStrong,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {rec && !reduce && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.ring,
            {
              borderRadius: br,
              borderColor: c.danger,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] }) }],
            },
          ]}
        />
      )}
      <Ic name="mic" s={Math.round(size * 0.45)} c={fg} strokeWidth={rec ? 2.2 : 1.9} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  /* Mêmes valeurs que `Field` — la parenté visuelle doit rester évidente. */
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { position: 'relative', justifyContent: 'center' },
  input: { paddingHorizontal: 13, paddingVertical: 12, borderRadius: 11, fontSize: 16 },
  msg: { fontSize: 12.5, marginTop: 5, fontWeight: '600' },

  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ring: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderWidth: 2 },
  inset: { position: 'absolute', right: 4 },
  insetMid: { top: 4 },
  insetTop: { top: 5 },

  heard: { marginTop: 6, paddingVertical: 7, paddingHorizontal: 11, borderRadius: radius.small },
  heardTxt: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

  issue: { marginTop: 8, gap: 8 },
  issueBtn: { alignSelf: 'flex-start' },
})
