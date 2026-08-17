import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { ToastProvider } from '@/components/ui'
import { hydrateLang } from '@/lib/i18n'
import { NotificationsProvider } from '@/lib/notifications'
import { SessionProvider, useSession } from '@/lib/session'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'

SplashScreen.preventAutoHideAsync().catch(() => { /* déjà masqué */ })

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={s.fill}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <NotificationsProvider>
              <ToastProvider>
                <Root />
              </ToastProvider>
            </NotificationsProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function Root() {
  const { c, dark } = useTheme()
  const { me, loading } = useSession()
  const segments = useSegments()
  const router = useRouter()
  const [langReady, setLangReady] = useState(false)
  /* Un lien planii://invite/<token> ouvert hors session : on garde le jeton et
     on y revient dès la connexion, sinon l'invitation serait perdue. */
  const pendingInvite = useRef<string | null>(null)

  useEffect(() => { hydrateLang().finally(() => setLangReady(true)) }, [])

  const ready = langReady && !loading

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => { /* ignore */ })
  }, [ready])

  useEffect(() => {
    if (!ready) return
    const segs = segments as unknown as string[]
    const root = segs[0]
    const inAuth = root === '(auth)'

    if (!me) {
      if (root === 'invite' && segs[1]) pendingInvite.current = segs[1]
      if (!inAuth) router.replace('/login')
      return
    }
    const invite = pendingInvite.current
    if (invite) {
      pendingInvite.current = null
      router.replace({ pathname: '/invite/[token]', params: { token: invite } })
      return
    }
    if (inAuth) router.replace('/')
  }, [ready, me, segments, router])

  if (!ready) {
    return (
      <View style={[s.boot, { backgroundColor: c.bg }]}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <ActivityIndicator color={c.accent} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.accent,
          headerTitleStyle: { color: c.text, fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="project/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="invite/[token]" options={{ headerShown: true, title: 'Invitation' }} />
      </Stack>
    </>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
