import { StyleSheet, Text } from 'react-native'
import { SectionHeader, Tabs } from '@/components/ui'
import { t, useI18n } from '@/lib/i18n'
import { useTheme, type Theme } from '@/theme/ThemeProvider'

/* Apparence — portage de `ThemeControl` (planii-vite/src/App.tsx).
   Le « auto » du web bascule selon l'heure (sombre de 19 h à 7 h) ; sur mobile
   il suit le réglage clair/sombre du système, comme l'attend un utilisateur
   iOS/Android. La clé i18n `theme.autoHint` décrit encore la règle horaire du
   web : on écrit donc ici la phrase juste pour le mobile. */

export function ThemeControl() {
  const { pref, setPref } = useTheme()
  useI18n()
  return (
    <>
      <SectionHeader title={t('theme.title')} />
      <Tabs<Theme>
        items={[
          { key: 'light', label: t('theme.light'), icon: 'sun' },
          { key: 'dark', label: t('theme.dark'), icon: 'moon' },
          { key: 'auto', label: t('theme.auto'), icon: 'monitor' },
        ]}
        value={pref}
        onChange={setPref}
      />
      <Hint />
    </>
  )
}

function Hint() {
  const { c } = useTheme()
  return (
    <Text style={[s.hint, { color: c.hint }]}>
      Le mode auto suit le réglage clair/sombre de ton appareil.
    </Text>
  )
}

const s = StyleSheet.create({
  hint: { fontSize: 12.5, lineHeight: 18, marginTop: 8 },
})
