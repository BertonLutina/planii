import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Tabs } from 'expo-router'
import { Ic, type IconName } from '@/components/Icon'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { useTheme } from '@/theme/ThemeProvider'

/** Pastille de fond de l'onglet actif (`.bottomnav button.on .bic`). */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const { c } = useTheme()
  return (
    <View style={[s.bic, focused && { backgroundColor: c.accentBg }]}>
      <Ic name={name} s={22} c={focused ? c.accent : c.muted} />
    </View>
  )
}

export default function TabsLayout() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const { me } = useSession()
  useI18n() // ré-affiche les libellés au changement de langue

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: s.label,
        tabBarItemStyle: s.item,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home'), tabBarIcon: ({ focused }) => <TabIcon name="nav-home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="projets"
        options={{ title: t('nav.projects'), tabBarIcon: ({ focused }) => <TabIcon name="nav-projects" focused={focused} /> }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: t('nav.agenda'), tabBarIcon: ({ focused }) => <TabIcon name="nav-agenda" focused={focused} /> }}
      />
      <Tabs.Screen
        name="classement"
        options={{ title: t('nav.leaderboard'), tabBarIcon: ({ focused }) => <TabIcon name="nav-leaderboard" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t('nav.profile'), tabBarIcon: ({ focused }) => <TabIcon name="nav-profile" focused={focused} /> }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t('nav.admin'),
          tabBarIcon: ({ focused }) => <TabIcon name="nav-admin" focused={focused} />,
          /* Onglet réservé aux administrateurs — masqué (et injoignable) sinon. */
          href: me?.admin ? undefined : null,
        }}
      />
    </Tabs>
  )
}

const s = StyleSheet.create({
  bic: { width: 40, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600' },
  item: { paddingTop: 2 },
})
