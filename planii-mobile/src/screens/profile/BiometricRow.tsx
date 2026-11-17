import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Card, SectionHeader, Switch } from '@/components/ui'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { useTheme } from '@/theme/ThemeProvider'

/** Visible seulement si l'appareil a une biométrie enregistrée. */
export function BiometricRow() {
  const { c } = useTheme()
  const {
    biometricAvailable, biometricLabel, biometricEnabled, setBiometricEnabled,
  } = useSession()
  useI18n()
  const [busy, setBusy] = useState(false)

  if (!biometricAvailable) return null

  async function onChange(next: boolean) {
    if (busy) return
    setBusy(true)
    try { await setBiometricEnabled(next) } finally { setBusy(false) }
  }

  const title = t('bio.rowTitle', { label: biometricLabel })

  return (
    <>
      <SectionHeader title={t('bio.section')} />
      <Card>
        <View style={s.row}>
          <View style={s.copy}>
            <Text style={[s.title, { color: c.text }]}>{title}</Text>
            <Text style={[s.desc, { color: c.muted }]}>{t('bio.rowDesc', { label: biometricLabel })}</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={(next) => { void onChange(next) }}
            disabled={busy}
            accessibilityLabel={title}
            testID="bio-profile-switch"
          />
        </View>
      </Card>
    </>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  desc: { fontSize: 13, lineHeight: 18 },
})
