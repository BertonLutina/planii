import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { Banner, Button, Card, Confirm, Pill, toast, toastErr } from '@/components/ui'
import { api } from '@/lib/api'
import { getLang, t, useI18n } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'

/* Écran « Connecteur MCP » — portage de `AiAssistantsPage` (planii-vite/src/components/AiAssistants.tsx).
   Mêmes étapes, mêmes guides, mêmes exemples, mêmes réglages d'accès. L'autorisation se fait sur la page
   web de consentement que l'assistant ouvre dans le navigateur (Planii ne revendique pas /oauth). */

type Connection = { id: string; clientName: string; scopes: string[]; createdAt: string; lastUsedAt: string | null }
type Activity = { id: string; clientName: string | null; tool: string; write: boolean; ok: boolean; detail: string | null; at: string }

const SCOPE_KEY: Record<string, string> = { 'planii:read': 'ai.scopeRead', 'planii:write': 'ai.scopeWrite', 'planii:delete': 'ai.scopeDelete' }
const SCOPE_TONE: Record<string, 'neutral' | 'warn' | 'danger'> = { 'planii:read': 'neutral', 'planii:write': 'warn', 'planii:delete': 'danger' }
const PROMPT_KEYS = ['ai.prompt1', 'ai.prompt2', 'ai.prompt3', 'ai.prompt4', 'ai.prompt5', 'ai.prompt6']
const CAN_KEYS = ['ai.can1', 'ai.can2', 'ai.can3', 'ai.can4', 'ai.can5', 'ai.can6']
const SITES: { label: string; url: string }[] = [
  { label: 'Claude', url: 'https://claude.ai' },
  { label: 'ChatGPT', url: 'https://chatgpt.com' },
  { label: 'Gemini', url: 'https://gemini.google.com' },
]

function ago(iso: string | null): string {
  if (!iso) return ''
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(getLang(), { numeric: 'auto' })
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, secs] of steps) if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  return rtf.format(0, 'second')
}

function copyText(text: string) {
  if (!text) return
  Clipboard.setStringAsync(text).then(() => toast(t('ai.copied'))).catch(() => toastErr(t('ai.copyFail')))
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const { c } = useTheme()
  return (
    <Card style={s.gap}>
      <View style={s.stepHead}>
        <View style={[s.stepN, { backgroundColor: c.accent }]}><Text style={s.stepNText}>{n}</Text></View>
        <Text accessibilityRole="header" style={[s.stepTitle, { color: c.text }]}>{title}</Text>
      </View>
      {children}
    </Card>
  )
}

function Code({ text }: { text: string }) {
  const { c } = useTheme()
  return (
    <View style={[s.code, { backgroundColor: c.surface2, borderColor: c.line }]}>
      <Text selectable style={[s.codeText, { color: c.text }]}>{text}</Text>
      <Button label={t('ai.copy')} size="sm" variant="secondary" onPress={() => copyText(text)} />
    </View>
  )
}

function Guide({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const { c } = useTheme()
  return (
    <View style={[s.guide, { borderColor: c.line }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={s.guideHead}>
        <Text style={[s.guideTitle, { color: c.text }]}>{title}</Text>
        <Text style={{ color: c.muted, fontSize: 16 }}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open && <View style={s.guideBody}>{children}</View>}
    </View>
  )
}

export function McpScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  useI18n()
  const [url, setUrl] = useState('')
  const [conns, setConns] = useState<Connection[] | null>(null)
  const [acts, setActs] = useState<Activity[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [openGuide, setOpenGuide] = useState<string | null>('claude')
  const [toRevoke, setToRevoke] = useState<Connection | null>(null)
  const [revoking, setRevoking] = useState(false)

  const load = useCallback(async () => {
    try {
      const [cn, ac] = await Promise.all([
        api<{ mcpUrl: string; connections: Connection[] }>('GET', '/me/ai-connections'),
        api<{ items: Activity[] }>('GET', '/me/ai-activity?limit=20'),
      ])
      setUrl(cn.mcpUrl); setConns(cn.connections); setActs(ac.items); setErr(null)
    } catch (e) {
      setErr((e as Error).message || t('ai.loadErr'))
    }
  }, [])
  useEffect(() => { void load() }, [load])

  async function revoke() {
    if (!toRevoke || revoking) return
    setRevoking(true)
    try {
      await api('DELETE', '/me/ai-connections/' + toRevoke.id)
      toast(t('ai.revoked'))
      setToRevoke(null)
      await load()
    } catch (e) {
      setErr((e as Error).message)
      setToRevoke(null)
    } finally {
      setRevoking(false)
    }
  }

  const toggle = (k: string) => setOpenGuide((g) => (g === k ? null : k))
  const muted = { color: c.muted }
  const gemini = JSON.stringify({ mcpServers: { planii: { httpUrl: url } } })

  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title: t('nav.mcp') }} />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {!!err && <Banner tone="danger" icon="alert" text={err} style={s.gap} />}

        <Card style={s.gap}>
          <Text accessibilityRole="header" style={[s.hero, { color: c.text }]}>{t('ai.heroTitle')}</Text>
          <Text style={[s.desc, muted]}>{t('ai.intro')}</Text>
          <Text style={[s.desc, muted, s.mt]}>{t('ai.teamNote')}</Text>
        </Card>

        <Step n={1} title={t('ai.s1')}>
          <Text style={[s.desc, muted]}>{t('ai.s1Body')}</Text>
          <Code text={url || '…'} />
        </Step>

        <Step n={2} title={t('ai.s2')}>
          <Text style={[s.desc, muted]}>{t('ai.s2MobileBody')}</Text>
          <View style={s.sites}>
            {SITES.map((a) => <Button key={a.label} label={a.label} size="sm" variant="secondary" onPress={() => { void Linking.openURL(a.url) }} />)}
          </View>
          <Guide title="Claude" open={openGuide === 'claude'} onToggle={() => toggle('claude')}>
            <Text style={[s.desc, muted]}>{'1. ' + t('ai.claude1')}</Text>
            <Text style={[s.desc, muted]}>{'2. ' + t('ai.claude2')}</Text>
            <Text style={[s.desc, muted]}>{'3. ' + t('ai.claude3')}</Text>
            <Text style={[s.desc, muted, s.mt]}>{t('ai.claudeCode')}</Text>
            <Code text={`claude mcp add --transport http planii ${url}`} />
          </Guide>
          <Guide title="ChatGPT" open={openGuide === 'gpt'} onToggle={() => toggle('gpt')}>
            <Text style={[s.desc, muted]}>{'1. ' + t('ai.gpt1')}</Text>
            <Text style={[s.desc, muted]}>{'2. ' + t('ai.gpt2')}</Text>
            <Text style={[s.desc, muted]}>{'3. ' + t('ai.gpt3')}</Text>
            <Text style={[s.desc, muted, s.mt]}>{t('ai.gptNote')}</Text>
          </Guide>
          <Guide title="Gemini" open={openGuide === 'gemini'} onToggle={() => toggle('gemini')}>
            <Text style={[s.desc, muted]}>{t('ai.gemini1')}</Text>
            <Code text={gemini} />
            <Text style={[s.desc, muted]}>{t('ai.gemini2')}</Text>
          </Guide>
          <Guide title={t('ai.others')} open={openGuide === 'others'} onToggle={() => toggle('others')}>
            <Text style={[s.desc, muted]}>{t('ai.othersBody')}</Text>
            <Code text={url || '…'} />
          </Guide>
          <Text style={[s.small, muted]}>{t('ai.menusNote')}</Text>
        </Step>

        <Step n={3} title={t('ai.s3')}>
          <Text style={[s.desc, muted]}>{t('ai.s3Body')}</Text>
        </Step>

        <Step n={4} title={t('ai.s4')}>
          <Text style={[s.desc, muted]}>{t('ai.s4Body')}</Text>
          {PROMPT_KEYS.map((k) => (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={t('ai.copy') + ' : ' + t(k)} onPress={() => copyText(t(k))}
              style={[s.prompt, { backgroundColor: c.surface2, borderColor: c.line }]}>
              <Text style={[s.promptText, { color: c.text }]}>{'« ' + t(k) + ' »'}</Text>
              <Text style={[s.small, { color: c.accent }]}>{t('ai.copy')}</Text>
            </Pressable>
          ))}
        </Step>

        <Card style={s.gap}>
          <Text accessibilityRole="header" style={[s.stepTitle, { color: c.text }]}>{t('ai.authorized')}</Text>
          {conns === null ? <Text style={[s.desc, muted, s.mt]}>{t('common.loading')}</Text>
            : conns.length === 0 ? <Text style={[s.desc, muted, s.mt]}>{t('ai.noneYet')}</Text>
            : conns.map((cn) => (
              <View key={cn.id} style={[s.conn, { borderColor: c.line }]}>
                <Text style={[s.name, { color: c.text }]}>{cn.clientName}</Text>
                <View style={s.scopes}>
                  {cn.scopes.map((sc) => <Pill key={sc} label={t(SCOPE_KEY[sc] || sc)} tone={SCOPE_TONE[sc] || 'neutral'} />)}
                </View>
                <Text style={[s.small, muted]}>
                  {t('ai.connectedOn', { d: new Date(cn.createdAt).toLocaleDateString(getLang()) })} · {cn.lastUsedAt ? t('ai.lastUsed', { d: ago(cn.lastUsedAt) }) : t('ai.neverUsed')}
                </Text>
                <Button label={t('ai.revoke')} variant="danger" size="sm" onPress={() => setToRevoke(cn)} style={s.revoke} />
              </View>
            ))}
        </Card>

        <Card style={s.gap}>
          <Text accessibilityRole="header" style={[s.stepTitle, { color: c.text }]}>{t('ai.canTitle')}</Text>
          {CAN_KEYS.map((k) => <Text key={k} style={[s.desc, muted, s.mt]}>{'• ' + t(k)}</Text>)}
          <Text accessibilityRole="header" style={[s.stepTitle, { color: c.text }, s.mtBig]}>{t('ai.dataTitle')}</Text>
          {['ai.data1', 'ai.data2', 'ai.data3'].map((k) => <Text key={k} style={[s.desc, muted, s.mt]}>{'• ' + t(k)}</Text>)}
        </Card>

        <Card style={s.gap} padded={false}>
          <Text accessibilityRole="header" style={[s.stepTitle, { color: c.text }, s.histHead]}>{t('ai.history')}</Text>
          {acts === null ? null : acts.length === 0 ? <Text style={[s.desc, muted, s.histHead]}>{t('ai.noHistory')}</Text> : acts.map((a, i) => (
            <View key={a.id} style={[s.act, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
              <Text style={[s.tool, { color: a.ok ? c.text : c.danger }]}>{a.tool.replace('planii_', '')}{a.write ? ' · ' + t('ai.scopeWrite') : ''}{a.ok ? '' : ' · ' + t('ai.failed')}</Text>
              <Text style={[s.small, muted]}>{[a.clientName, ago(a.at), a.detail].filter(Boolean).join(' · ')}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      <Confirm
        open={!!toRevoke}
        onClose={() => setToRevoke(null)}
        title={t('ai.revokeTitle', { n: toRevoke?.clientName ?? '' })}
        message={t('ai.revokeBody')}
        confirmLabel={t('ai.revoke')}
        loading={revoking}
        onConfirm={() => { void revoke() }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 18 },
  gap: { marginBottom: 12 },
  hero: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  desc: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 12.5, lineHeight: 17, marginTop: 6 },
  mt: { marginTop: 8 },
  mtBig: { marginTop: 18 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stepN: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepTitle: { fontSize: 16, fontWeight: '700' },
  code: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
  codeText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: 'Menlo' },
  sites: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  guide: { borderWidth: 1, borderRadius: 12, marginTop: 8, overflow: 'hidden' },
  guideHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, minHeight: 48 },
  guideTitle: { fontSize: 15, fontWeight: '700' },
  guideBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 4 },
  prompt: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8, gap: 4 },
  promptText: { fontSize: 14, lineHeight: 20 },
  conn: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  scopes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  revoke: { marginTop: 10, alignSelf: 'flex-start' },
  histHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  act: { paddingHorizontal: 16, paddingVertical: 10 },
  tool: { fontSize: 13.5, fontWeight: '700' },
})
