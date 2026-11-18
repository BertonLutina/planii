import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, Button, Ic, SelectBox, Skeleton, toast } from '@/components/ui'
import { announce } from '@/lib/a11y'
import { api } from '@/lib/api'
import { getLang, langOptions, setLang, t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { User } from '@/lib/types'
import { PvThemeScope, useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { Glow, LandingLogo, lpDark, lpLight } from './lp'
import { ProviderMark } from './ProviderMark'
import { RefField } from './RefField'
import {
  PROVIDER_LABEL, PROVIDER_ORDER, listProviders, signInWithProvider,
  type ProviderKey, type Providers,
} from './oauth'

const SUPPORT_MAIL = 'info@planii.app'
const PRIVACY_URL = 'https://planii.app/confidentialite'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Mode = 'login' | 'signup' | 'forgot' | 'reset'
interface Errors { name?: string; email?: string; password?: string; confirm?: string }

/** L'écran de connexion reprend l'univers de la page d'accueil publique (clair et sombre). */
export function AuthScreen(props: { mode: Mode; resetToken?: string }) {
  return <PvThemeScope><Auth {...props} /></PvThemeScope>
}

const PROVIDER_NAME: Record<ProviderKey, string> = { google: 'Google', microsoft: 'Microsoft', linkedin: 'LinkedIn', yahoo: 'Yahoo' }

function Auth({ mode, resetToken = '' }: { mode: Mode; resetToken?: string }) {
  const { c, dark, setPref } = useTheme()
  const lp = dark ? lpDark : lpLight
  const { width } = useWindowDimensions()
  const [langOpen, setLangOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signIn, signOut } = useSession()
  const { lang } = useI18n()

  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errs, setErrs] = useState<Errors>({})
  const [formErr, setFormErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  // Lien déjà utilisé, expiré ou falsifié : le formulaire ne sert plus à rien, on propose d'en redemander un.
  const [linkBad, setLinkBad] = useState(false)

  const [providers, setProviders] = useState<Providers>({})
  const [provLoading, setProvLoading] = useState(true)
  const [oauthBusy, setOauthBusy] = useState<ProviderKey | null>(null)

  const emailRef = useRef<TextInput>(null)
  const passRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)

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
    if (mode !== 'reset') {
      if (!f.email.trim()) next.email = 'Indique ton e-mail'
      else if (!EMAIL_RE.test(f.email.trim())) next.email = 'Cette adresse e-mail n’est pas valide'
    }
    if (mode === 'forgot') {
      setErrs(next)
      return Object.keys(next).length === 0
    }
    if (!f.password) next.password = 'Indique ton mot de passe'
    else if (mode === 'reset' && f.password.length < 8) next.password = t('auth.resetShort')
    if (mode === 'reset' && f.password !== f.confirm) next.confirm = t('auth.resetMismatch')
    setErrs(next)
    return Object.keys(next).length === 0
  }

  async function submit() {
    if (busy || !validate()) return
    setFormErr(null)
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await api('POST', '/auth/forgot-password', { email: f.email.trim() })
        setSent(true)
        return
      }
      if (mode === 'reset') {
        if (!resetToken) { setFormErr(t('auth.resetInvalid')); return }
        await api('POST', '/auth/reset-password', { token: resetToken, password: f.password })
        signOut()
        toast(t('auth.resetOk'))
        router.replace('/login')
        return
      }
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login'
        ? { email: f.email.trim(), password: f.password }
        : {
          name: f.name.trim(),
          email: f.email.trim(),
          password: f.password,
          lang: getLang(),
        }
      const r = await api<{ token: string; user: User }>('POST', path, body)
      signIn(r.user, r.token)
    } catch (e) {
      const raw = (e as Error).message || ''
      // Seul un refus du serveur sur le jeton vaut « lien invalide » ; une coupure réseau se réessaie.
      const badLink = mode === 'reset' && /lien invalide|invalid|expir|token|jeton/i.test(raw)
      if (badLink) setLinkBad(true)
      const msg = badLink ? t('auth.resetInvalid') : raw
      setFormErr(msg)
      announce(msg)
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
  const forgot = mode === 'forgot'
  const reset = mode === 'reset'
  const resetBroken = reset && (!resetToken || linkBad)
  const langOpts = langOptions()
  const title = signup ? t('auth.register')
    : forgot ? t('auth.forgotTitle')
    : reset ? t('auth.resetTitle')
    : t('auth.login')
  const sub = signup ? t('auth.startSub')
    : forgot ? t('auth.forgotSub')
    : reset ? t('auth.resetSub')
    : t('auth.welcomeBack')

  const strength = (() => {
    const v = f.password
    if (!v || !signup) return 0
    let n = 0
    if (v.length >= 8) n++
    if (/\d/.test(v)) n++
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++
    if (v.length >= 12) n++
    return Math.max(1, n)
  })()
  const showHero = !forgot && !reset
  const langLabel = langOpts.find((o) => o.value === lang)?.label ?? lang

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.screen, { backgroundColor: lp.bg }]}
    >
      <Glow lp={lp} width={width} />
      <ScrollView
        contentContainerStyle={[s.body, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Barre du haut : marque, langue, thème. */}
        <View style={s.bar}>
          <LandingLogo lp={lp} size={32} />
          <Text accessibilityRole="header" style={[s.wordmark, { color: lp.text }]}>Planii</Text>
          <View style={s.grow} />
          <Pressable
            onPress={() => setLangOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`${t('lang.title')} : ${langLabel}`}
            accessibilityState={{ expanded: langOpen }}
            style={[s.chip, { borderColor: lp.line2, backgroundColor: lp.card }]}
          >
            <Text numberOfLines={1} style={[s.chipTxt, { color: lp.muted }]}>{langLabel}</Text>
            <Ic name="chevron-down" s={14} c={lp.muted} />
          </Pressable>
          <Pressable
            onPress={() => setPref(dark ? 'light' : 'dark')}
            accessibilityRole="button"
            accessibilityLabel={t('theme.title')}
            style={[s.theme, { borderColor: lp.line2, backgroundColor: lp.card }]}
          >
            <Ic name={dark ? 'sun' : 'moon'} s={17} c={lp.muted} />
          </Pressable>
        </View>

        {langOpen && (
          <View style={[s.langBox, { borderColor: lp.line, backgroundColor: lp.card }]}>
            <SelectBox
              label={t('lang.title')}
              value={lang}
              options={langOpts}
              onChange={(code) => { setLang(code as typeof lang); setLangOpen(false) }}
              searchable={false}
              style={s.langTop}
            />
          </View>
        )}

        {showHero && (
          <View style={s.hero}>
            <View style={[s.badge, { borderColor: lp.line2, backgroundColor: lp.card }]}>
              <View style={s.badgeDot} />
              <Text style={[s.badgeTxt, { color: lp.accFg }]}>{t('au.badge')}</Text>
            </View>
            <Text accessibilityRole="header" style={[s.h1, { color: lp.text }]}>
              {signup ? t('au.s1') : t('au.h1')}{'\n'}
              <Text style={{ color: lp.title2 }}>{signup ? t('au.s2') : t('au.h2')}</Text>
            </Text>
            <Text style={[s.trust, { color: lp.muted }]}>{t('au.t1')} · {t('au.t2')} · {t('au.t3')}</Text>
          </View>
        )}

        <View style={[s.card, { backgroundColor: lp.card, borderColor: lp.line }]}>
          {showHero && (
            <View style={[s.tabs, { borderBottomColor: lp.line }]} accessibilityRole="tablist">
              {([['login', t('auth.login'), '/login'], ['signup', t('auth.register'), '/register']] as const).map(([k, label, href]) => {
                const on = mode === k
                return (
                  <Pressable
                    key={k}
                    onPress={() => { if (!on) router.replace(href) }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={[s.tab, { borderBottomColor: on ? '#6d5cff' : 'transparent' }]}
                  >
                    <Text style={[s.tabTxt, { color: on ? lp.text : lp.hint }]}>{label}</Text>
                  </Pressable>
                )
              })}
            </View>
          )}

          <View style={s.head}>
            <Text accessibilityRole="header" style={[s.pageTitle, { color: lp.text }]}>{title}</Text>
            <Text style={[s.pageSub, { color: lp.muted }]}>{sub}</Text>
          </View>

          {!!formErr && <Banner tone="danger" icon="alert" text={formErr} style={s.formErr} />}

          {resetBroken ? (
            <>
              {!formErr && <Banner tone="danger" icon="alert" text={t('auth.resetInvalid')} style={s.formErr} />}
              <Button
                label={t('auth.resetRequestNew')}
                variant="primary"
                block
                onPress={() => router.replace('/forgot-password' as Href)}
                style={s.submit}
              />
            </>
          ) : forgot && sent ? (
            <Banner tone="ok" icon="check" text={t('auth.forgotSent')} style={s.formErr} />
          ) : (
            <>
              {signup && (
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
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              )}

              {!reset && (
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
                  returnKeyType={forgot ? 'go' : 'next'}
                  blurOnSubmit={forgot}
                  onSubmitEditing={() => (forgot ? submit() : passRef.current?.focus())}
                />
              )}
              {(mode === 'login' || signup) && (
                <RefField
                  ref={passRef}
                  label={t('auth.password')}
                  value={f.password}
                  onChangeText={set('password')}
                  placeholder={signup ? t('auth.resetHint') : '••••••••'}
                  error={errs.password}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={signup ? 'new-password' : 'password'}
                  textContentType={signup ? 'newPassword' : 'password'}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
              )}
              {signup && (
                <View style={s.meter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[s.seg, { backgroundColor: i <= strength ? ['', c.danger, c.warn, '#6d5cff', c.ok][strength] : lp.line2 }]}
                    />
                  ))}
                </View>
              )}
              {mode === 'login' && (
                <Pressable
                  onPress={() => router.push('/forgot-password' as Href)}
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel={t('auth.forgot')}
                  style={s.forgot}
                >
                  <Text style={[s.forgotTxt, { color: lp.accFg }]}>{t('auth.forgot')}</Text>
                </Pressable>
              )}
              {reset && (
                <>
                  <RefField
                    ref={passRef}
                    label={t('auth.resetPassword')}
                    value={f.password}
                    onChangeText={set('password')}
                    placeholder="••••••••"
                    error={errs.password}
                    hint={t('auth.resetHint')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <RefField
                    ref={confirmRef}
                    label={t('auth.resetConfirm')}
                    value={f.confirm}
                    onChangeText={set('confirm')}
                    placeholder="••••••••"
                    error={errs.confirm}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                  />
                </>
              )}

              <Pressable
                onPress={submit}
                disabled={busy || !!oauthBusy}
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: busy || !!oauthBusy }}
                style={({ pressed }) => [s.go, { opacity: busy || oauthBusy ? 0.7 : pressed ? 0.9 : 1 }]}
              >
                {busy
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <>
                      <Text style={s.goTxt}>
                        {signup ? t('auth.signup') : forgot ? t('auth.forgotSubmit') : reset ? t('auth.resetSubmit') : t('auth.login')}
                      </Text>
                      {(mode === 'login' || signup) && <Ic name="arrow-right" s={17} c="#fff" strokeWidth={2.2} />}
                    </>
                  )}
              </Pressable>
            </>
          )}

          {!forgot && !reset && (provLoading ? (
            <View style={s.grid}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={s.cell}><Skeleton height={44} borderRadius={12} /></View>
              ))}
            </View>
          ) : enabled.length > 0 ? (
            <View>
              <View style={s.or}>
                <View style={[s.orLine, { backgroundColor: lp.line }]} />
                <Text style={[s.orTxt, { color: lp.hint }]}>{t('auth.orEmail')}</Text>
                <View style={[s.orLine, { backgroundColor: lp.line }]} />
              </View>
              <View style={s.grid}>
                {enabled.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => startOAuth(p)}
                    disabled={!!oauthBusy}
                    accessibilityRole="button"
                    accessibilityLabel={t(PROVIDER_LABEL[p])}
                    accessibilityState={{ disabled: !!oauthBusy, busy: oauthBusy === p }}
                    style={({ pressed }) => [
                      s.cell, s.pbtn,
                      {
                        backgroundColor: pressed ? lp.accBg : lp.card,
                        borderColor: lp.line2,
                        opacity: oauthBusy && oauthBusy !== p ? 0.5 : 1,
                      },
                    ]}
                  >
                    <ProviderMark provider={p} size={18} />
                    <Text style={[s.pname, { color: lp.text }]}>{PROVIDER_NAME[p]}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null)}

          {(forgot || reset) && (
            <Pressable
              onPress={() => router.replace('/login')}
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel={t('auth.forgotBack')}
              style={s.switch}
            >
              <Text style={[s.switchTxt, { color: lp.accFg, fontWeight: '700' }]}>{t('auth.forgotBack')}</Text>
            </Pressable>
          )}

          <View style={s.footLinks}>
            <Pressable
              onPress={() => { Linking.openURL(PRIVACY_URL).catch(() => {}) }}
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel={t('auth.privacy')}
            >
              <Text style={[s.footLink, { color: lp.hint }]}>{t('auth.privacy')}</Text>
            </Pressable>
            <Pressable
              onPress={() => { Linking.openURL(`mailto:${SUPPORT_MAIL}`).catch(() => {}) }}
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel={SUPPORT_MAIL}
            >
              <Text style={[s.footLink, { color: lp.hint }]}>{t('auth.help')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: 18, flexGrow: 1 },
  grow: { flex: 1 },

  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56 },
  wordmark: { fontSize: 20, fontWeight: '700', letterSpacing: -0.6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, maxWidth: 150 },
  chipTxt: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  theme: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  langBox: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 8 },
  langTop: { marginBottom: 0 },

  hero: { marginTop: 14, marginBottom: 22 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start', height: 34, paddingHorizontal: 13, borderRadius: 17, borderWidth: 1 },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#18a97c' },
  badgeTxt: { fontSize: 12.5, fontWeight: '600' },
  h1: { fontSize: 36, lineHeight: 38, fontWeight: '800', letterSpacing: -1.6, marginTop: 18 },
  trust: { fontSize: 13, marginTop: 14, lineHeight: 19 },

  card: {
    borderWidth: 1, borderRadius: 24, padding: 22, marginTop: 4,
    shadowColor: '#0b0a12', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 3,
  },
  tabs: { flexDirection: 'row', gap: 26, borderBottomWidth: 1, marginBottom: 22 },
  tab: { paddingBottom: 12, marginBottom: -1, borderBottomWidth: 3 },
  tabTxt: { fontSize: 15, fontWeight: '700' },
  head: { marginBottom: 20 },
  pageTitle: { fontSize: 26, lineHeight: 29, fontWeight: '800', letterSpacing: -1 },
  pageSub: { fontSize: 14.5, lineHeight: 21, marginTop: 6 },

  formErr: { marginBottom: 14 },
  meter: { flexDirection: 'row', gap: 5, marginTop: -4, marginBottom: 14 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 14 },
  forgotTxt: { fontSize: 13.5, fontWeight: '600' },
  submit: { marginTop: 2 },
  go: {
    height: 50, borderRadius: 13, backgroundColor: '#6d5cff', marginTop: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    shadowColor: '#6d5cff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6,
  },
  goTxt: { color: '#fff', fontSize: 15.5, fontWeight: '700' },

  or: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22, marginBottom: 14 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orTxt: { fontSize: 13, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48%', flexGrow: 1, minWidth: 0 },
  pbtn: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderRadius: 12 },
  pname: { fontSize: 14, fontWeight: '600' },

  switch: { marginTop: 18, alignItems: 'center' },
  switchTxt: { fontSize: 14, textAlign: 'center' },
  footLinks: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 24 },
  footLink: { fontSize: 13, fontWeight: '500' },
})
