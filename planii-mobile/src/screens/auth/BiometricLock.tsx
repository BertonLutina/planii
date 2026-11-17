import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandTile } from '@/components/BrandMark'
import { Button, Ic } from '@/components/ui'
import { biometricIcon } from '@/lib/biometrics'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { useTheme } from '@/theme/ThemeProvider'

/** Plein écran à la place du navigateur. Le profil restauré n'est pas encore
 *  la session : aucun écran connecté n'est monté derrière. */
export function BiometricLock() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const { lockedFirstName, biometricLabel, unlock, signOut } = useSession()
  useI18n()
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    setBusy(true)
    try { await unlock() } finally { setBusy(false) }
  }, [unlock])

  useEffect(() => { void run() }, [run])

  const greeting = lockedFirstName
    ? t('bio.greetingName', { name: lockedFirstName })
    : t('bio.greeting')

  return (
    <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
      <BrandTile size={44} />

      <View style={s.copy}>
        <Text accessibilityRole="header" style={[s.greeting, { color: c.text }]}>{greeting}</Text>
        <Text style={[s.locked, { color: c.muted }]}>{t('bio.locked')}</Text>
      </View>

      <View
        accessible
        accessibilityLabel={biometricLabel}
        style={[s.badge, { backgroundColor: c.accentBg }]}
      >
        <Ic name={biometricIcon(biometricLabel)} s={40} c={c.accent} strokeWidth={1.7} />
      </View>

      <View style={s.actions}>
        <Button
          label={t('bio.unlock')}
          icon={biometricIcon(biometricLabel)}
          variant="primary"
          block
          loading={busy}
          onPress={() => { void run() }}
          testID="bio-lock-unlock"
        />
        <Pressable
          onPress={signOut}
          accessibilityRole="link"
          accessibilityLabel={t('profile.logout')}
          hitSlop={8}
          style={s.logout}
          testID="bio-lock-logout"
        >
          <Text style={[s.logoutTxt, { color: c.accent }]}>{t('profile.logout')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  copy: { marginTop: 28, maxWidth: 320, alignItems: 'center' },
  greeting: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  locked: { marginTop: 10, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  badge: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 36,
  },
  actions: { marginTop: 'auto', width: '100%', maxWidth: 360, alignItems: 'center' },
  logout: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  logoutTxt: { fontSize: 16, fontWeight: '600' },
})
