import type { ComponentProps } from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationTheme } from '@react-navigation/native'
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs'
import { Platform } from 'react-native'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { useTheme } from '@/theme/ThemeProvider'

/* Barre d'onglets native : UITabBar (Liquid Glass iOS 26) / Material 3
   Bottom Navigation (Android). Les icônes SVG custom ne passent pas dans
   la chrome système — SF Symbols côté iOS, Material Icons côté Android. */

function Md({ name }: { name: ComponentProps<typeof MaterialIcons>['name'] }) {
  return <VectorIcon family={MaterialIcons} name={name} />
}

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
          <Label>{t('nav.home')}</Label>
          <Icon sf={{ default: 'house', selected: 'house.fill' }} androidSrc={<Md name="home" />} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="projets">
          <Label>{t('nav.projects')}</Label>
          <Icon sf={{ default: 'folder', selected: 'folder.fill' }} androidSrc={<Md name="folder" />} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="agenda">
          <Label>{t('nav.agenda')}</Label>
          <Icon sf="calendar" androidSrc={<Md name="calendar-today" />} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="classement" hidden={hideLeaderboard}>
          <Label>{t('nav.leaderboard')}</Label>
          <Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} androidSrc={<Md name="emoji-events" />} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profil">
          <Label>{t('nav.profile')}</Label>
          <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} androidSrc={<Md name="person" />} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="admin" hidden={!isAdmin}>
          <Label>{t('nav.admin')}</Label>
          <Icon sf={{ default: 'checkmark.shield', selected: 'checkmark.shield.fill' }} androidSrc={<Md name="admin-panel-settings" />} />
        </NativeTabs.Trigger>
      </NativeTabs>
    </NavigationTheme>
  )
}
