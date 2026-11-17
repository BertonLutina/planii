import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Button, Card, Pill, SectionHeader, toast, toastErr } from '@/components/ui'
import { api } from '@/lib/api'
import { t, useI18n } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'

/* Assistants IA — carte du Profil (portage de `AiAssistantsEntry`, planii-vite/src/components/AiAssistants.tsx).
   Résumé + copie rapide de l'adresse ; le guide complet et la gestion des accès sont dans l'écran `/mcp`. */

export function AiAssistantsSection() {
  const { c } = useTheme()
  const router = useRouter()
  useI18n()
  const [url, setUrl] = useState('')
  const [count, setCount] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api<{ mcpUrl: string; connections: unknown[] }>('GET', '/me/ai-connections')
      setUrl(r.mcpUrl); setCount(r.connections.length)
    } catch { /* la carte reste utilisable : l'écran dédié affiche l'erreur */ }
  }, [])
  useEffect(() => { void load() }, [load])

  // `Href` explicite : les types de routes générés (.expo/types) ne connaissent /mcp qu'après le prochain `expo start`.
  const open = () => router.push('/mcp' as Href)
  const copy = useCallback(() => {
    if (!url) return
    Clipboard.setStringAsync(url).then(() => toast(t('ai.copied'))).catch(() => toastErr(t('ai.copyFail')))
  }, [url])

  return (
    <>
      <SectionHeader title={t('nav.mcp')} actionLabel={t('ai.openGuide')} onAction={open} />
      <Card>
        <Text style={[s.desc, { color: c.muted }]}>{t('ai.intro')}</Text>
        {count !== null && (
          <Pill
            label={count ? t('ai.connectedCount', { n: count }) : t('ai.noneShort')}
            tone={count ? 'ok' : 'neutral'}
            style={s.pill}
          />
        )}
        <Button label={t('ai.openGuide')} icon="sparkles" variant="primary" block onPress={open} style={s.btn} />
        <Button label={t('ai.copyUrl')} icon="paperclip" variant="secondary" block onPress={copy} disabled={!url} style={s.btn} />
      </Card>
    </>
  )
}

const s = StyleSheet.create({
  desc: { fontSize: 13.5, lineHeight: 19 },
  pill: { marginTop: 10, alignSelf: 'flex-start' },
  btn: { marginTop: 12 },
})
