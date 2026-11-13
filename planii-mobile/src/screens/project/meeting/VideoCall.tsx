import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Banner } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'

/** Expo web n'a pas le module natif WebRTC. La visio est dans l'app iOS/Android. */
export function VideoCall(_props: { projectId: string }) {
  const { c } = useTheme()
  const router = useRouter()
  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <Banner tone="accent" icon="video" text={t('meet.videoWeb')} />
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={s.back}>
        <Text style={[s.backTxt, { color: c.accentOn }]}>{t('meet.videoLeave')}</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  back: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  backTxt: { fontSize: 16, fontWeight: '700' },
})
