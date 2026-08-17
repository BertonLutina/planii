import { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, Button, SelectBox, Skeleton } from '@/components/ui'
import { BrandTile } from '@/components/BrandMark'
import { api } from '@/lib/api'
import { getLang, langOptions, setLang, t, useI18n } from '@/lib/i18n'
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
interface Errors { name?: string; email?: string; password?: string }

export function AuthScreen({ mode }: { mode: Mode }) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signIn } = useSession()
  const { lang } = useI18n()

  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [errs, setErrs] = useState<Errors>({})
  const [formErr, setFormErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [providers, setProviders] = useState<Providers>({})
  const [provLoading, setProvLoading] = useState(true)
  const [oauthBusy, setOauthBusy] = useState<ProviderKey | null>(null)

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
          email: f.email.trim(),
          password: f.password,
          lang: getLang(),
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
  const langOpts = langOptions()

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
        {/* Verrou de marque : tuile et nom restent solidaires, centrés.
            34 px de tuile → la marque tombe sous 48 px, donc variante simplifiée. */}
        <View style={s.brand}>
          <BrandTile size={48} radius={10} />
          <Text accessibilityRole="header" style={[s.wordmark, { color: c.text }]}>Planii</Text>
        </View>

        {/* Le titre porte l'action ; la ligne en dessous accueille, elle
            n'explique pas le produit — l'app est déjà installée. */}
        <View style={s.head}>
          <Text accessibilityRole="header" style={[s.pageTitle, { color: c.text }]}>
            {signup ? t('auth.register') : t('auth.login')}
          </Text>
          <Text style={[s.pageSub, { color: c.muted }]}>
            {signup ? t('auth.startSub') : t('auth.welcomeBack')}
          </Text>
        </View>

        {/* La langue vient avant les fournisseurs, sur les deux écrans : c'est le
            seul moment où quelqu'un arrivé dans la mauvaise langue peut en sortir,
            et il doit pouvoir le faire avant de commencer quoi que ce soit. */}
        <SelectBox
          label={t('lang.title')}
          value={lang}
          options={langOpts}
          onChange={(code) => setLang(code as typeof lang)}
          searchable={false}
          style={s.langTop}
        />

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

        {/* Nom, e-mail, mot de passe — rien de plus. Métier et pays ne changent
            rien à cet instant : ils se demandent dans le profil, au moment où
            ils servent. Chaque champ posé avant la première réussite est une fuite. */}
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

        {/* Réglages et mentions : après l'action, jamais avant.
            À la connexion, la langue vit ici. */}
        <View style={[s.foot, { borderTopColor: c.line }]}>
          <View style={s.footLinks}>
            <Pressable
              onPress={() => { Linking.openURL(PRIVACY_URL).catch(() => {}) }}
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel={t('auth.privacy')}
            >
              <Text style={[s.footLink, { color: c.accent }]}>{t('auth.privacy')}</Text>
            </Pressable>
            <View style={[s.footDot, { backgroundColor: c.lineStrong }]} />
            <Pressable
              onPress={() => { Linking.openURL(`mailto:${SUPPORT_MAIL}`).catch(() => {}) }}
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel={SUPPORT_MAIL}
            >
              <Text style={[s.footLink, { color: c.accent }]}>{t('auth.help')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: 18, flexGrow: 1, justifyContent: 'center' },

  // Verrou : tuile + nom sur une ligne, solidaires et centrés.
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20  },
  wordmark: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },

  head: { marginTop: 30, marginBottom: 18 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  pageSub: { fontSize: 14.5, lineHeight: 21, marginTop: 4 },

  langTop: { marginBottom: 16 },

  social: { marginBottom: 4 },
  // Pleine largeur, alignée sur la listbox de langue au-dessus : les quatre
  // boutons se partagent la ligne, d'un bord à l'autre du contenu.
  socialRow: { flexDirection: 'row', gap: 8, width: '100%' },
  socialCell: { flex: 1, minWidth: 0 },
  socialBtn: {
    height: 58, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: radius.control,
  },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orTxt: { fontSize: 12.5, fontWeight: '600' },

  formErr: { marginBottom: 14 },
  submit: { marginTop: 2 },
  switch: { marginTop: 16, alignItems: 'center' },
  switchTxt: { fontSize: 14, textAlign: 'center' },

  foot: { marginTop: 26, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  footLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  footLink: { fontSize: 12.5, fontWeight: '700' },
  footDot: { width: 3, height: 3, borderRadius: 2 },
})
