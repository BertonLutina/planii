import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import * as Updates from 'expo-updates'
import { Button, Card, Ic, Pill, toast, toastErr, type IconName } from '@/components/ui'
import { getLang, t, useI18n } from '@/lib/i18n'
import { APP_VERSION, RELEASES, pick, type ReleaseKind } from '@/lib/releases'
import { useTheme } from '@/theme/ThemeProvider'

/* Release Notes — portage de `ReleaseNotes` (planii-vite/src/components/ReleaseNotes.tsx).
   Version actuelle, bouton de mise à jour (expo-updates), puis le journal ajouté / modifié / corrigé. */

const KIND_KEY: Record<ReleaseKind, string> = { added: 'rn.added', changed: 'rn.changed', fixed: 'rn.fixed' }
const KIND_ICON: Record<ReleaseKind, IconName> = { added: 'plus', changed: 'edit', fixed: 'check' }
const KIND_ORDER: ReleaseKind[] = ['added', 'changed', 'fixed']

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function ReleaseNotesScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  useI18n()
  const lang = getLang()
  const [busy, setBusy] = useState(false)

  async function onCheck() {
    if (busy) return
    if (!Updates.isEnabled) { toast(t('rn.devBuild')); return }
    setBusy(true)
    try {
      const r = await Updates.checkForUpdateAsync()
      if (!r.isAvailable) { toast(t('rn.upToDate')); return }
      toast(t('rn.updating'))
      await Updates.fetchUpdateAsync()
      await Updates.reloadAsync()
    } catch {
      toastErr(t('rn.updateFail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('nav.notes') }} />
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={s.gap}>
          <Text style={[s.label, { color: c.muted }]}>{t('rn.current')}</Text>
          <Text accessibilityRole="header" style={[s.version, { color: c.accent }]}>v{APP_VERSION}</Text>
          <Text style={[s.intro, { color: c.muted }]}>{t('rn.intro')}</Text>
          <Button
            label={busy ? t('rn.checking') : t('rn.check')}
            icon="refresh"
            variant="primary"
            block
            disabled={busy}
            onPress={onCheck}
            style={s.check}
          />
        </Card>

        {RELEASES.map((r, i) => (
          <Card key={r.version} style={s.gap}>
            <View style={s.head}>
              <Pill label={`v${r.version}`} tone="accent" />
              {i === 0 && <Pill label={t('rn.latest')} tone="ok" />}
              <Text style={[s.date, { color: c.muted }]}>{formatDate(r.date, lang)}</Text>
            </View>
            <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>{pick(r.title, lang)}</Text>
            {KIND_ORDER.map((kind) => {
              const items = r.items.filter((it) => it.kind === kind)
              if (!items.length) return null
              const tone = kind === 'added' ? c.ok : kind === 'fixed' ? c.warn : c.accent
              return (
                <View key={kind} style={s.group}>
                  <View style={s.kindRow}>
                    <Ic name={KIND_ICON[kind]} s={14} c={tone} />
                    <Text style={[s.kind, { color: tone }]}>{t(KIND_KEY[kind]).toUpperCase()}</Text>
                  </View>
                  {items.map((it, k) => (
                    <View key={k} style={s.item}>
                      <Text style={[s.bullet, { color: c.muted }]}>•</Text>
                      <Text style={[s.itemText, { color: c.text }]}>
                        {pick(it.text, lang)}
                        {it.on ? <Text style={{ color: c.muted, fontSize: 11.5, fontWeight: '700' }}>{'  '}{t(it.on === 'web' ? 'rn.web' : 'rn.mobile')}</Text> : null}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            })}
          </Card>
        ))}
      </ScrollView>
    </>
  )
}

const s = StyleSheet.create({
  body: { padding: 18 },
  gap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  version: { fontSize: 34, fontWeight: '800', marginTop: 2 },
  intro: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  check: { marginTop: 14 },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  date: { fontSize: 12.5, marginLeft: 'auto' },
  title: { fontSize: 17, fontWeight: '700', marginTop: 10 },
  group: { marginTop: 12 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  kind: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  item: { flexDirection: 'row', gap: 8, marginTop: 3 },
  bullet: { fontSize: 14, lineHeight: 21 },
  itemText: { flex: 1, fontSize: 14, lineHeight: 21 },
})
