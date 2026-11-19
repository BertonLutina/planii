import { DarkTheme, DefaultTheme, ThemeProvider as NavigationTheme } from 'expo-router/react-navigation'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { Platform } from 'react-native'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { useTheme } from '@/theme/ThemeProvider'

/* Barre d'onglets native : UITabBar (Liquid Glass iOS 26) / Material 3
   Bottom Navigation (Android). Les icônes SVG custom ne passent pas dans
   la chrome système — SF Symbols côté iOS (`sf`), Material Symbols côté Android (`md`).
   `md` est résolu par le système : l'ancienne `src={<VectorIcon />}` n'affichait rien sur Android. */

export default function TabsLayout() {
  const { c, dark } = useTheme()
  const { me } = useSession()
  useI18n()

  const isAdmin = !!me?.admin
  /* Material 3 n'accepte que 5 destinations. Sur Android, l'espace admin
     remplace le classement — il reste joignable depuis le profil. iOS
     accepte le 6ᵉ onglet. */
  const hideLeaderboard = Platform.OS === 'android' && isAdmin

  const navTheme = dark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg, card: c.surface, primary: c.accent, text: c.text, border: c.line } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg, card: c.surface, primary: c.accent, text: c.text, border: c.line } }

  return (
    <NavigationTheme value={navTheme}>
      <NativeTabs
        tintColor={c.accent}
        iconColor={{ default: c.muted, selected: c.accent }}
        labelStyle={{
          default: { color: c.muted, fontSize: 11, fontWeight: '600' },
          selected: { color: c.accent, fontSize: 11, fontWeight: '600' },
        }}
        backgroundColor={c.surface}
        indicatorColor={c.accentBg}
        rippleColor={c.accentSoft}
        labelVisibilityMode="labeled"
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{t('nav.home')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="projets">
          <NativeTabs.Trigger.Label>{t('nav.projects')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} md="folder" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="agenda">
          <NativeTabs.Trigger.Label>{t('nav.agenda')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_today" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="classement" hidden={hideLeaderboard}>
          <NativeTabs.Trigger.Label>{t('nav.leaderboard')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} md="emoji_events" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profil">
          <NativeTabs.Trigger.Label>{t('nav.profile')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="person" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="admin" hidden={!isAdmin}>
          <NativeTabs.Trigger.Label>{t('nav.admin')}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.shield', selected: 'checkmark.shield.fill' }} md="admin_panel_settings" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </NavigationTheme>
  )
}
