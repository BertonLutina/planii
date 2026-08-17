import { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, Button, SelectBox, Skeleton } from '@/components/ui'
import { Flag, LANG_FLAG } from '@/components/Flag'
import { BrandTile } from '@/components/BrandMark'
import { api } from '@/lib/api'
import { COUNTRIES } from '@/lib/countries'
import { LANGS, getLang, setLang, t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { ProviderMark } from './ProviderMark'
import { RefField } from './RefField'
import {
  PROVIDER_LABEL, PROVIDER_ORDER, listProviders, signInWithProvider,
  type ProviderKey, type Providers,
} from './oauth'

const SUPPORT_MAIL = 'info@planii.app'
const PRIVACY_URL = 'https://planii.app/confidentialite'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Mode = 'login' | 'signup'
interface Errors { name?: string; email?: string; password?: string; country?: string }

export function AuthScreen({ mode }: { mode: Mode }) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signIn } = useSession()
  const { lang } = useI18n()

  const [f, setF] = useState({ name: '', job: '', email: '', password: '', country: 'fr' })
  const [errs, setErrs] = useState<Errors>({})
  const [formErr, setFormErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [providers, setProviders] = useState<Providers>({})
  const [provLoading, setProvLoading] = useState(true)
  const [oauthBusy, setOauthBusy] = useState<ProviderKey | null>(null)

  const jobRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const passRef = useRef<TextInput>(null)

  useEffect(() => {
    let alive = true
    listProviders()
      .then((p) => { if (alive) setProviders(p) })
      .catch(() => { if (alive) setProviders({}) })
      .finally(() => { if (alive) setProvLoading(false) })
    return () => { alive = false }
  }, [])

  const set = (k: keyof typeof f) => (v: string) => {
    setF((prev) => ({ ...prev, [k]: v }))
    if (k in errs) setErrs((e) => ({ ...e, [k]: undefined }))
    if (formErr) setFormErr(null)
  }

  function validate(): boolean {
    const next: Errors = {}
    if (mode === 'signup' && !f.name.trim()) next.name = 'Indique ton nom complet'
    if (mode === 'signup' && !f.country) next.country = 'Choisis ton pays'
    if (!f.email.trim()) next.email = 'Indique ton e-mail'
    else if (!EMAIL_RE.test(f.email.trim())) next.email = 'Cette adresse e-mail n’est pas valide'
    if (!f.password) next.password = 'Indique ton mot de passe'
    setErrs(next)
    return Object.keys(next).length === 0
  }

  async function submit() {
    if (busy || !validate()) return
    setFormErr(null)
    setBusy(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login'
        ? { email: f.email.trim(), password: f.password }
        : {
          name: f.name.trim(),
          job: f.job.trim(),
          email: f.email.trim(),
          password: f.password,
          lang: getLang(),
          country: f.country,
        }
      const r = await api<{ token: string; user: User }>('POST', path, body)
      signIn(r.user, r.token)
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function startOAuth(provider: ProviderKey) {
    if (oauthBusy || busy) return
    setFormErr(null)
    setOauthBusy(provider)
    try {
      const r = await signInWithProvider(provider)
      if (r) signIn(r.user, r.token)
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setOauthBusy(null)
    }
  }

  const enabled = PROVIDER_ORDER.filter((p) => providers[p])
  const signup = mode === 'signup'
  const langOpts = LANGS.map((l) => ({ value: l.code, label: l.label, flag: LANG_FLAG[l.code] || l.code }))
  const countryOpts = COUNTRIES.map((x) => ({
    value: x.code,
    label: lang === 'en' ? x.nameEn : x.name,
    flag: x.code,
  }))

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.screen, { backgroundColor: c.bg }]}
    >
      <ScrollView
        contentContainerStyle={[s.body, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brand}>
          {/* 72 px : la marque fait 47 px, l'évidement tient. Plus petit, il
              faudrait basculer sur la variante simplifiée. */}
          <BrandTile size={72} simplified={false} />
          <Text accessibilityRole="header" style={[s.wordmark, { color: c.text }]}>Planii</Text>
          <Text style={[s.tagline, { color: c.muted }]}>{t('auth.tagline')}</Text>
        </View>

        {/* Drapeaux en ligne — même sélecteur que le web : la langue se change
            d'un seul geste, sans ouvrir de liste. */}
        <View style={s.langRow} accessibilityRole="radiogroup" accessibilityLabel={t('lang.title')}>
          {langOpts.map((l) => {
            const on = lang === l.value
            return (
              <Pressable
                key={l.value}
                onPress={() => setLang(l.value as typeof lang)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={l.label}
                style={({ pressed }) => [
                  s.langBtn,
                  {
                    backgroundColor: on ? c.accentBg : pressed ? c.surface2 : c.surface,
                    borderColor: on ? c.accentOn : c.line,
                  },
                ]}
              >
                <Flag code={l.flag} size={17} />
              </Pressable>
            )
          })}
        </View>

        <Text accessibilityRole="header" style={[s.pageTitle, { color: c.text }]}>
          {signup ? t('auth.register') : t('auth.login')}
        </Text>

        {provLoading ? (
          <View style={s.social}>
            <View style={s.socialRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={s.socialCell}>
                  <Skeleton height={58} borderRadius={radius.control} />
                </View>
              ))}
            </View>
          </View>
        ) : enabled.length > 0 ? (
          <View style={s.social}>
            {/* Boutons carrés, logo seul, aux couleurs officielles — même
                traitement que le web. Sans libellé écrit, les chartes Google et
                Microsoft imposent la marque en couleur, pas une silhouette. */}
            <View style={s.socialRow}>
              {enabled.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => startOAuth(p)}
                  disabled={!!oauthBusy}
                  accessibilityRole="button"
                  accessibilityLabel={t(PROVIDER_LABEL[p])}
                  accessibilityState={{ disabled: !!oauthBusy, busy: oauthBusy === p }}
                  style={({ pressed }) => [
                    s.socialCell,
                    s.socialBtn,
                    {
                      backgroundColor: pressed ? c.accentBg : c.surface,
                      borderColor: pressed ? c.accentOn : c.line,
                      opacity: oauthBusy && oauthBusy !== p ? 0.5 : 1,
                    },
                  ]}
                >
                  <ProviderMark provider={p} size={26} />
                </Pressable>
              ))}
            </View>
            <View style={s.or}>
              <View style={[s.orLine, { backgroundColor: c.line }]} />
              <Text style={[s.orTxt, { color: c.hint }]}>{t('auth.orEmail')}</Text>
              <View style={[s.orLine, { backgroundColor: c.line }]} />
            </View>
          </View>
        ) : null}

        {!!formErr && <Banner tone="danger" icon="alert" text={formErr} style={s.formErr} />}

        {signup && (
          <>
            <RefField
              label={t('auth.name')}
              value={f.name}
              onChangeText={set('name')}
              placeholder="Ex. Awa Ndiaye"
              error={errs.name}
              maxLength={120}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => jobRef.current?.focus()}
            />
            <RefField
              ref={jobRef}
              label={t('auth.job')}
              value={f.job}
              onChangeText={set('job')}
              placeholder={t('profile.phJob')}
              maxLength={60}
              autoCapitalize="sentences"
              autoComplete="off"
              textContentType="jobTitle"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <SelectBox
              label={t('auth.country')}
              value={f.country}
              options={countryOpts}
              onChange={set('country')}
              placeholder={t('auth.countryPh')}
              error={errs.country}
              searchable
            />
          </>
        )}

        <RefField
          ref={emailRef}
          label={t('auth.email')}
          value={f.email}
          onChangeText={set('email')}
          placeholder="vous@exemple.com"
          error={errs.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passRef.current?.focus()}
        />
        <RefField
          ref={passRef}
          label={t('auth.password')}
          value={f.password}
          onChangeText={set('password')}
          placeholder="••••••••"
          error={errs.password}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={signup ? 'new-password' : 'password'}
          textContentType={signup ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <Button
          label={signup ? t('auth.signup') : t('auth.login')}
          variant="primary"
          block
          loading={busy}
          disabled={!!oauthBusy}
          onPress={submit}
          style={s.submit}
        />

        <Pressable
          onPress={() => router.replace(signup ? '/login' : '/register')}
          hitSlop={10}
          accessibilityRole="link"
          style={s.switch}
        >
          <Text style={[s.switchTxt, { color: c.muted }]}>
            {signup ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
            <Text style={{ color: c.accent, fontWeight: '700' }}>
              {signup ? t('auth.login') : t('auth.register')}
            </Text>
          </Text>
        </Pressable>

        <View style={s.foot}>
          <Text style={[s.footTxt, { color: c.hint }]}>{t('auth.support')}</Text>
          <Pressable
            onPress={() => { Linking.openURL(`mailto:${SUPPORT_MAIL}`).catch(() => {}) }}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel={SUPPORT_MAIL}
          >
            <Text style={[s.footLink, { color: c.accent }]}>{SUPPORT_MAIL}</Text>
          </Pressable>
          <Pressable
            onPress={() => { Linking.openURL(PRIVACY_URL).catch(() => {}) }}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel={t('auth.privacy')}
            style={s.privacy}
          >
            <Text style={[s.footLink, { color: c.accent }]}>{t('auth.privacy')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: 18, flexGrow: 1, justifyContent: 'center' },

  brand: { alignItems: 'center', marginBottom: 14 },
  wordmark: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: 10 },
  tagline: { fontSize: 13.5, lineHeight: 19, textAlign: 'center', marginTop: 6, maxWidth: 320 },
  pageTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 12 },

  // Drapeaux : 46×44 pour rester au-dessus de la cible tactile de 44 pt.
  langRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginBottom: 16 },
  langBtn: {
    width: 46, height: 44, borderWidth: 1, borderRadius: radius.control,
    alignItems: 'center', justifyContent: 'center',
  },

  social: { marginBottom: 4 },
  socialRow: { flexDirection: 'row', gap: 8, alignSelf: 'center', maxWidth: 300, width: '100%' },
  socialCell: { flex: 1, minWidth: 0 },
  socialBtn: {
    aspectRatio: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: radius.control,
  },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orTxt: { fontSize: 12.5, fontWeight: '600' },

  formErr: { marginBottom: 14 },
  submit: { marginTop: 2 },
  switch: { marginTop: 16, alignItems: 'center' },
  switchTxt: { fontSize: 14, textAlign: 'center' },

  foot: { alignItems: 'center', marginTop: 22, gap: 4 },
  footTxt: { fontSize: 12.5, textAlign: 'center' },
  footLink: { fontSize: 12.5, fontWeight: '700' },
  privacy: { marginTop: 6 },
})
