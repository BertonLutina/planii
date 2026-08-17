import { StyleSheet, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { EmptyState } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'

export default function NotFoundScreen() {
  const { c } = useTheme()
  const router = useRouter()
  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Page introuvable' }} />
      <EmptyState
        icon="help"
        title="Cette page n’existe pas"
        message="Le lien est peut-être périmé ou mal recopié."
        actionLabel="Revenir à l’accueil"
        onAction={() => router.replace('/')}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
})
