import { useCallback, useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Banner, Button, Card, Confirm, GroupHeader, Pill, SectionHeader, Sheet, toast, toastErr } from '@/components/ui'
import { api } from '@/lib/api'
import { getLang, t, useI18n } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'

/* Assistants IA (connecteur MCP) — portage de `AiAssistantsModal` (planii-vite/src/components/AiAssistants.tsx).
   Le mobile sert à : copier l'adresse du serveur, voir les applications autorisées, les révoquer
   et relire l'historique. L'autorisation elle-même se fait sur la page web de consentement que
   l'assistant ouvre dans le navigateur (pas dans l'app : Planii ne revendique pas /oauth). */

type Connection = { id: string; clientName: string; scopes: string[]; createdAt: string; lastUsedAt: string | null }
type Activity = { id: string; clientName: string | null; tool: string; write: boolean; ok: boolean; detail: string | null; at: string }

const SCOPE_KEY: Record<string, string> = { 'planii:read': 'ai.scopeRead', 'planii:write': 'ai.scopeWrite', 'planii:delete': 'ai.scopeDelete' }
const SCOPE_TONE: Record<string, 'neutral' | 'warn' | 'danger'> = { 'planii:read': 'neutral', 'planii:write': 'warn', 'planii:delete': 'danger' }

const ASSISTANT_SITES: { label: string; url: string }[] = [
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

export function AiAssistantsSection() {
  const { c } = useTheme()
  useI18n()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [conns, setConns] = useState<Connection[] | null>(null)
  const [acts, setActs] = useState<Activity[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [toRevoke, setToRevoke] = useState<Connection | null>(null)
  const [revoking, setRevoking] = useState(false)

  const load = useCallback(async () => {
    try {
      const [cn, ac] = await Promise.all([
        api<{ mcpUrl: string; connections: Connection[] }>('GET', '/me/ai-connections'),
        api<{ items: Activity[] }>('GET', '/me/ai-activity?limit=15'),
      ])
      setUrl(cn.mcpUrl); setConns(cn.connections); setActs(ac.items); setErr(null)
    } catch (e) {
      setErr((e as Error).message || t('ai.loadErr'))
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const copy = useCallback(() => {
    if (!url) return
    Clipboard.setStringAsync(url).then(() => toast(t('ai.copied'))).catch(() => toastErr(t('ai.copyFail')))
  }, [url])

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

  return (
    <>
      <SectionHeader title={t('ai.title')} actionLabel={t('ai.manage')} onAction={() => setOpen(true)} />
      <Card>
        <Text style={[s.desc, { color: c.muted }]}>{t('ai.intro')}</Text>
        {conns && (
          <Pill
            label={conns.length ? t('ai.connectedCount', { n: conns.length }) : t('ai.noneShort')}
            tone={conns.length ? 'ok' : 'neutral'}
            style={s.pill}
          />
        )}
        <Button label={t('ai.copyUrl')} icon="paperclip" variant="secondary" block onPress={copy} disabled={!url} style={s.copyBtn} />
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('ai.title')}>
        {!!err && <Banner tone="danger" icon="alert" text={err} style={s.gap} />}

        <GroupHeader title={t('ai.urlTitle')} />
        <Card>
          <Text selectable style={[s.url, { color: c.text }]}>{url || '…'}</Text>
          <Button label={t('ai.copy')} variant="primary" block onPress={copy} disabled={!url} style={s.copyBtn} />
        </Card>

        <GroupHeader title={t('ai.connectTitle')} />
        <Card>
          <Text style={[s.desc, { color: c.muted }]}>{t('ai.mobileGuide')}</Text>
          <View style={s.sites}>
            {ASSISTANT_SITES.map((a) => (
              <Button key={a.label} label={a.label} size="sm" variant="secondary" onPress={() => { void Linking.openURL(a.url) }} />
            ))}
          </View>
        </Card>

        <GroupHeader title={t('ai.authorized')} />
        {conns === null ? <Text style={[s.desc, { color: c.muted }]}>{t('common.loading')}</Text>
          : conns.length === 0 ? <Text style={[s.desc, { color: c.muted }]}>{t('ai.noneYet')}</Text>
          : conns.map((cn) => (
            <Card key={cn.id} style={s.gap}>
              <Text style={[s.name, { color: c.text }]}>{cn.clientName}</Text>
              <View style={s.scopes}>
                {cn.scopes.map((sc) => <Pill key={sc} label={t(SCOPE_KEY[sc] || sc)} tone={SCOPE_TONE[sc] || 'neutral'} />)}
              </View>
              <Text style={[s.meta, { color: c.muted }]}>
                {t('ai.connectedOn', { d: new Date(cn.createdAt).toLocaleDateString(getLang()) })} · {cn.lastUsedAt ? t('ai.lastUsed', { d: ago(cn.lastUsedAt) }) : t('ai.neverUsed')}
              </Text>
              <Button label={t('ai.revoke')} variant="danger" size="sm" onPress={() => setToRevoke(cn)} style={s.revoke} />
            </Card>
          ))}

        <GroupHeader title={t('ai.dataTitle')} />
        <Card>
          <Text style={[s.desc, { color: c.muted }]}>{'• ' + t('ai.data1')}</Text>
          <Text style={[s.desc, { color: c.muted }]}>{'• ' + t('ai.data2')}</Text>
          <Text style={[s.desc, { color: c.muted }]}>{'• ' + t('ai.data3')}</Text>
        </Card>

        <GroupHeader title={t('ai.history')} />
        {acts === null ? null : acts.length === 0 ? <Text style={[s.desc, { color: c.muted }]}>{t('ai.noHistory')}</Text> : (
          <Card padded={false}>
            {acts.map((a, i) => (
              <View key={a.id} style={[s.act, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
                <Text style={[s.tool, { color: a.ok ? c.text : c.danger }]}>{a.tool.replace('planii_', '')}{a.write ? ' · ' + t('ai.scopeWrite') : ''}{a.ok ? '' : ' · ' + t('ai.failed')}</Text>
                <Text style={[s.meta, { color: c.muted }]}>{[a.clientName, ago(a.at), a.detail].filter(Boolean).join(' · ')}</Text>
              </View>
            ))}
          </Card>
        )}
      </Sheet>

      <Confirm
        open={!!toRevoke}
        onClose={() => setToRevoke(null)}
        title={t('ai.revokeTitle', { n: toRevoke?.clientName ?? '' })}
        message={t('ai.revokeBody')}
        confirmLabel={t('ai.revoke')}
        loading={revoking}
        onConfirm={() => { void revoke() }}
      />
    </>
  )
}

const s = StyleSheet.create({
  desc: { fontSize: 13.5, lineHeight: 19 },
  pill: { marginTop: 10, alignSelf: 'flex-start' },
  copyBtn: { marginTop: 12 },
  url: { fontSize: 14, lineHeight: 20, fontFamily: 'Menlo' },
  sites: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  gap: { marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700' },
  scopes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  meta: { fontSize: 12.5, lineHeight: 17, marginTop: 6 },
  revoke: { marginTop: 10, alignSelf: 'flex-start' },
  act: { paddingHorizontal: 16, paddingVertical: 10 },
  tool: { fontSize: 13.5, fontWeight: '700' },
})
