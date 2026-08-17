import { useCallback, useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Banner, Button, Card, EmptyState, Field, Pill, Skeleton, toast, toastErr } from '@/components/ui'
import { api } from '@/lib/api'
import { ROLE_LABEL, TYPE_LABEL } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import type { InviteInfo } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Cible du lien profond planii://invite/<token> (et https://…/invite/<token>).
   Portage de `JoinModal` (planii-vite/src/components/Projects.tsx) : la modale
   du web devient un écran de pile, puisqu'on y arrive par un lien externe.
   Hors session, la racine mémorise le jeton et revient ici après connexion. */

/** Accepte aussi bien un lien complet qu'un code collé à la main. */
const extract = (s: string): string => {
  const m = String(s).match(/\/invite\/([^/?#\s]+)/)
  return m ? m[1] : String(s).trim()
}

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  useI18n()

  const [raw, setRaw] = useState(token ?? '')
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)
  /* On ne part en « vérification » que si le segment porte vraiment un code :
     un lien du type /invite/<vide> laissait sinon le squelette tourner à vide. */
  const [checking, setChecking] = useState(() => !!extract(token ?? ''))
  const [joining, setJoining] = useState(false)

  const preview = useCallback(async (value: string) => {
    const tok = extract(value)
    if (!tok) { setErr('Colle le lien ou le code reçu.'); setChecking(false); return }
    setErr(null); setInfo(null); setChecking(true)
    try {
      const r = await api<InviteInfo>('GET', '/invites/' + encodeURIComponent(tok))
      setInfo({ ...r, token: tok })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { if (token) preview(token) }, [token, preview])

  async function accept() {
    if (!info?.token || joining) return
    setJoining(true)
    try {
      const r = await api<{ project: { id: string } }>('POST', '/invites/' + encodeURIComponent(info.token) + '/accept', {})
      toast(t('proj.joined'))
      router.replace({ pathname: '/project/[id]', params: { id: r.project.id } })
    } catch (e) {
      toastErr((e as Error).message)
      setJoining(false)
    }
  }

  const empty = !checking && !info && !err && !raw.trim()

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.screen, { backgroundColor: c.bg }]}
    >
      <Stack.Screen options={{ title: t('proj.joinTitle') }} />
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field
          label={t('proj.inviteLink')}
          value={raw}
          onChangeText={(v) => { setRaw(v); setInfo(null); setErr(null) }}
          placeholder="https://planii.app/invite/…"
          autoCapitalize="none"
          autoComplete="off"
          returnKeyType="go"
          onSubmitEditing={() => preview(raw)}
          editable={!joining}
        />

        {/* Vérification en cours — gabarit de la carte d'invitation */}
        {checking && (
          <Card style={s.card}>
            <Skeleton width="62%" height={17} />
            <Skeleton width="84%" height={13} style={s.skelLine} />
            <Skeleton height={46} borderRadius={radius.control} style={s.skelBtn} />
          </Card>
        )}

        {/* Lien invalide, expiré ou déjà utilisé — le serveur dit lequel */}
        {!checking && !!err && (
          <>
            <Banner tone="danger" icon="alert" text={err} style={s.banner} />
            <Button label={t('proj.check')} variant="primary" block onPress={() => preview(raw)} />
          </>
        )}

        {/* Rien de collé pour l'instant */}
        {empty && (
          <EmptyState
            icon="user-plus"
            title={t('proj.joinTitle')}
            message="Colle ici le lien d’invitation reçu par e-mail pour rejoindre le projet."
          />
        )}

        {/* Prêt à vérifier */}
        {!checking && !info && !err && !empty && (
          <Button label={t('proj.check')} variant="primary" block onPress={() => preview(raw)} />
        )}

        {/* Invitation valide */}
        {!checking && !!info && (
          <Card style={s.card}>
            <Text style={[s.projName, { color: c.text }]}>{info.project.name}</Text>
            <Pill label={TYPE_LABEL[info.project.type]} tone="neutral" style={s.pill} />
            <Text style={[s.sub, { color: c.muted }]}>
              {t('proj.joinAs')} <Text style={[s.subStrong, { color: c.text }]}>{ROLE_LABEL[info.role] || info.role}</Text>
              {info.invitedBy ? ` · ${t('proj.invitedBy')} ${info.invitedBy}` : ''}
            </Text>
            <Button
              label={t('proj.joinBtn')}
              variant="primary"
              block
              loading={joining}
              onPress={accept}
              style={s.join}
            />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: 18, paddingTop: 10 },
  card: { marginTop: 4 },
  skelLine: { marginTop: 10 },
  skelBtn: { marginTop: 16 },
  banner: { marginBottom: 12 },
  projName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  pill: { marginTop: 8 },
  sub: { fontSize: 13.5, lineHeight: 19, marginTop: 8 },
  subStrong: { fontWeight: '700' },
  join: { marginTop: 14 },
})
