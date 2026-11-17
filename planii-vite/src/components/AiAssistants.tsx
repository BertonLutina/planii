import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toast, toastErr } from '@/lib/ui'
import { getLang, t as tr, useI18n } from '@/lib/i18n'
import type { User } from '@/lib/types'
import { Ic } from './Icon'

/* Connecteur IA (MCP) — gestion des assistants autorisés + page de consentement OAuth. */

type Connection = { id: string; clientName: string; scopes: string[]; createdAt: string; lastUsedAt: string | null }
type Activity = { id: string; clientName: string | null; tool: string; write: boolean; ok: boolean; detail: string | null; at: string }

const SCOPE_KEY: Record<string, string> = { 'planii:read': 'ai.scopeRead', 'planii:write': 'ai.scopeWrite', 'planii:delete': 'ai.scopeDelete' }

function ago(iso: string | null): string {
  if (!iso) return ''
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(getLang(), { numeric: 'auto' })
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, s] of steps) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), unit)
  return rtf.format(0, 'second')
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast(tr('ai.copied')) } catch { toastErr(tr('ai.copyFail')) }
}

function CodeLine({ text }: { text: string }) {
  return (
    <div className="ai-code">
      <code>{text}</code>
      <button type="button" className="btn ghost sm" onClick={() => copy(text)} aria-label={tr('ai.copy')}>{tr('ai.copy')}</button>
    </div>
  )
}

function Guides({ url }: { url: string }) {
  const { t } = useI18n()
  const gemini = JSON.stringify({ mcpServers: { planii: { httpUrl: url } } })
  return (
    <div className="ai-guides">
      <details className="ai-guide">
        <summary>Claude</summary>
        <ol>
          <li>{t('ai.claude1')}</li>
          <li>{t('ai.claude2')}</li>
          <li>{t('ai.claude3')}</li>
        </ol>
        <p className="sub">{t('ai.claudeCode')}</p>
        <CodeLine text={`claude mcp add --transport http planii ${url}`} />
      </details>
      <details className="ai-guide">
        <summary>ChatGPT</summary>
        <ol>
          <li>{t('ai.gpt1')}</li>
          <li>{t('ai.gpt2')}</li>
          <li>{t('ai.gpt3')}</li>
        </ol>
        <p className="sub">{t('ai.gptNote')}</p>
      </details>
      <details className="ai-guide">
        <summary>Gemini</summary>
        <p className="sub" style={{ marginTop: 0 }}>{t('ai.gemini1')}</p>
        <CodeLine text={gemini} />
        <p className="sub">{t('ai.gemini2')}</p>
      </details>
      <details className="ai-guide">
        <summary>{t('ai.others')}</summary>
        <p className="sub" style={{ marginTop: 0 }}>{t('ai.othersBody')}</p>
        <CodeLine text={url} />
      </details>
      <p className="sub">{t('ai.menusNote')}</p>
    </div>
  )
}

function ScopeChips({ scopes }: { scopes: string[] }) {
  const { t } = useI18n()
  return (
    <span className="ai-scopes">
      {scopes.map((s) => <span key={s} className={'tag ai-scope' + (s === 'planii:delete' ? ' late' : s === 'planii:write' ? ' client' : ' me')}>{t(SCOPE_KEY[s] || s)}</span>)}
    </span>
  )
}

export function AiAssistantsModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [url, setUrl] = useState('')
  const [conns, setConns] = useState<Connection[] | null>(null)
  const [acts, setActs] = useState<Activity[] | null>(null)
  const [err, setErr] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api<{ mcpUrl: string; connections: Connection[] }>('GET', '/me/ai-connections'),
        api<{ items: Activity[] }>('GET', '/me/ai-activity'),
      ])
      setUrl(c.mcpUrl); setConns(c.connections); setActs(a.items); setErr(false)
    } catch { setErr(true) }
  }, [])
  useEffect(() => { load() }, [load])

  async function revoke(c: Connection) {
    if (!window.confirm(t('ai.revokeConfirm', { n: c.clientName }))) return
    try { await api('DELETE', '/me/ai-connections/' + c.id); toast(t('ai.revoked')); load() } catch (e) { toastErr((e as Error).message) }
  }

  return (
    <Modal title={t('ai.title')} onClose={onClose}>
      <p className="sub" style={{ marginTop: 0 }}>{t('ai.intro')}</p>
      {err && <p className="sub" role="alert" style={{ color: 'var(--danger)' }}>{t('ai.loadErr')} <button className="btn ghost sm" onClick={load}>{t('ai.retry')}</button></p>}

      <div className="section-h">{t('ai.urlTitle')}</div>
      <CodeLine text={url || '…'} />

      <div className="section-h" style={{ marginTop: 18 }}>{t('ai.connectTitle')}</div>
      <Guides url={url || ''} />

      <div className="section-h" style={{ marginTop: 18 }}>{t('ai.authorized')}</div>
      {conns === null ? <p className="sub">{t('common.loading')}</p>
        : conns.length === 0 ? <p className="sub">{t('ai.noneYet')}</p>
        : (
          <ul className="ai-conns">
            {conns.map((c) => (
              <li key={c.id} className="ai-conn">
                <div className="ai-conn-main">
                  <b>{c.clientName}</b>
                  <ScopeChips scopes={c.scopes} />
                  <span className="sub">{t('ai.connectedOn', { d: new Date(c.createdAt).toLocaleDateString(getLang()) })} · {c.lastUsedAt ? t('ai.lastUsed', { d: ago(c.lastUsedAt) }) : t('ai.neverUsed')}</span>
                </div>
                <button type="button" className="btn danger sm" onClick={() => revoke(c)}>{t('ai.revoke')}</button>
              </li>
            ))}
          </ul>
        )}

      <div className="section-h" style={{ marginTop: 18 }}>{t('ai.dataTitle')}</div>
      <ul className="ai-data">
        <li>{t('ai.data1')}</li>
        <li>{t('ai.data2')}</li>
        <li>{t('ai.data3')}</li>
      </ul>

      <div className="section-h" style={{ marginTop: 18 }}>{t('ai.history')}</div>
      {acts === null ? null : acts.length === 0 ? <p className="sub">{t('ai.noHistory')}</p> : (
        <ul className="ai-acts">
          {acts.map((a) => (
            <li key={a.id} className={a.ok ? '' : 'fail'}>
              <span className="ai-act-tool">{a.tool.replace('planii_', '')}</span>
              {a.write && <span className="tag client">{t('ai.scopeWrite')}</span>}
              {!a.ok && <span className="tag late">{t('ai.failed')}</span>}
              <span className="sub">{a.clientName || ''} · {ago(a.at)}{a.detail ? ' · ' + a.detail : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

/** Carte du Profil : point d'entrée « Assistants IA ». */
export function AiAssistantsEntry() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="section-h" style={{ marginTop: 18 }}>{t('ai.title')}</div>
      <button type="button" className="btn ghost block" onClick={() => setOpen(true)}>
        <Ic name="sparkles" s={16} /> {t('ai.manage')}
      </button>
      {open && <AiAssistantsModal onClose={() => setOpen(false)} />}
    </>
  )
}

/* ---------- Page de consentement OAuth (ouverte par l'assistant dans le navigateur) ---------- */

const PARAM_KEYS = ['client_id', 'redirect_uri', 'response_type', 'scope', 'state', 'code_challenge', 'code_challenge_method', 'resource']
export const isOAuthConsentRoute = () => window.location.pathname.replace(/\/+$/, '') === '/oauth/consent'

export function OAuthConsent({ me, onSwitchAccount }: { me: User; onSwitchAccount: () => void }) {
  const { t } = useI18n()
  const [params] = useState(() => {
    const q = new URLSearchParams(window.location.search)
    const p: Record<string, string> = {}
    for (const k of PARAM_KEYS) { const v = q.get(k); if (v) p[k] = v }
    return p
  })
  const [info, setInfo] = useState<{ clientName: string; scopes: string[]; redirectHost: string } | null>(null)
  const [error, setError] = useState('')
  const [granted, setGranted] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ clientName: string; scopes: string[]; redirectHost: string }>('POST', '/oauth/authorize/preview', params)
      .then((r) => { setInfo(r); setGranted(Object.fromEntries(r.scopes.map((s) => [s, true]))) })
      .catch((e) => setError((e as Error).message || t('ai.consentInvalid')))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function decide(approve: boolean) {
    if (busy) return
    setBusy(true)
    try {
      const scopes = Object.keys(granted).filter((s) => granted[s])
      const r = await api<{ redirectTo: string }>('POST', '/oauth/authorize/decision', { params, approve, scopes })
      window.location.href = r.redirectTo
    } catch (e) { setBusy(false); setError((e as Error).message) }
  }

  return (
    <main className="consent-page">
      <div className="card consent-card">
        <img src="/icons/icon-192.png" alt="" width={56} height={56} className="consent-logo" />
        {error && !info ? (
          <>
            <h1>{t('ai.consentErrTitle')}</h1>
            <p className="sub" role="alert">{error}</p>
          </>
        ) : !info ? <p className="sub">{t('common.loading')}</p> : (
          <>
            <h1>{t('ai.consentTitle', { n: info.clientName })}</h1>
            <p className="sub">{t('ai.consentAs', { e: me.email })} <button type="button" className="linklike" onClick={onSwitchAccount}>{t('ai.consentSwitch')}</button></p>
            <fieldset className="consent-scopes">
              <legend>{t('ai.consentCan')}</legend>
              {info.scopes.map((s) => (
                <label key={s} className="consent-scope">
                  <input type="checkbox" checked={!!granted[s]} disabled={s === 'planii:read' || busy}
                    onChange={(e) => setGranted((g) => ({ ...g, [s]: e.target.checked }))} />
                  <span><b>{t(SCOPE_KEY[s])}</b><br /><span className="sub">{t(SCOPE_KEY[s] + 'Desc')}</span></span>
                </label>
              ))}
            </fieldset>
            <p className="sub">{t('ai.consentLimit')}</p>
            <p className="sub">{t('ai.consentRedirect', { h: info.redirectHost })}</p>
            {error && <p className="sub" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
            <div className="consent-actions">
              <button type="button" className="btn ghost" disabled={busy} onClick={() => decide(false)}>{t('ai.consentDeny')}</button>
              <button type="button" className="btn primary" disabled={busy} onClick={() => decide(true)}>{t('ai.consentAllow')}</button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
