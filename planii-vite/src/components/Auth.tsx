import { useEffect, useState } from 'react'
import { api, setTok } from '@/lib/api'
import { toastErr } from '@/lib/ui'
import { MicInput } from './Mic'
import type { User } from '@/lib/types'
import { useI18n, LangFlags, getLang, t as tt } from '@/lib/i18n'

const API = (import.meta.env.VITE_API_URL as string) || 'https://api.planii.app/api'

type ProviderKey = 'google' | 'microsoft' | 'linkedin' | 'yahoo'
type Providers = Partial<Record<ProviderKey, boolean>>

const PROVIDER_ORDER: ProviderKey[] = ['google', 'microsoft', 'linkedin', 'yahoo']

const PROVIDER_LABEL: Record<ProviderKey, string> = {
  google: 'auth.continueGoogle',
  microsoft: 'auth.continueMicrosoft',
  linkedin: 'auth.continueLinkedin',
  yahoo: 'auth.continueYahoo',
}

function ProviderIcon({ provider }: { provider: ProviderKey }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    )
  }
  if (provider === 'microsoft') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    )
  }
  if (provider === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#6001D2" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm6.1 6.5h-2.3c-.2-.8-.5-1.5-.9-2.1 1.3.5 2.4 1.2 3.2 2.1zm-6.1-3.3c.7.8 1.3 1.9 1.6 3.3h-3.2c.3-1.4.9-2.5 1.6-3.3zM4.7 14.2c-.3-.7-.5-1.4-.5-2.2s.2-1.5.5-2.2h2.6c-.1.7-.1 1.4-.1 2.2s0 1.5.1 2.2H4.7zm1.2 1.5h2.3c.2.8.5 1.5.9 2.1-1.3-.5-2.4-1.2-3.2-2.1zm2.3-7.2H5.9c.8-.9 1.9-1.6 3.2-2.1-.4.6-.7 1.3-.9 2.1zM12 20.8c-.7-.8-1.3-1.9-1.6-3.3h3.2c-.3 1.4-.9 2.5-1.6 3.3zm2-5.1h-4c-.1-.7-.1-1.4-.1-2.2s0-1.5.1-2.2h4c.1.7.1 1.4.1 2.2s0 1.5-.1 2.2zm.4 4.2c.4-.6.7-1.3.9-2.1h2.3c-.8.9-1.9 1.6-3.2 2.1zm1.3-9.3c-.2-.8-.5-1.5-.9-2.1 1.3.5 2.4 1.2 3.2 2.1h-2.3zm2.4 5.1c.1-.7.1-1.4.1-2.2s0-1.5-.1-2.2h2.6c.3.7.5 1.4.5 2.2s-.2 1.5-.5 2.2h-2.6z" />
    </svg>
  )
}

export function Auth({ onAuth, initialMode = 'login', onBack }: {
  onAuth: (u: User) => void
  /** Ouvre directement sur l'inscription — utilisé par « Commencer gratuitement » de la landing. */
  initialMode?: 'login' | 'signup'
  /** Retour à la page d'accueil publique. Absent = pas de bouton retour. */
  onBack?: () => void
}) {
  const { t: tr } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [f, setF] = useState({ name: '', email: '', password: '', job: '' })
  const [busy, setBusy] = useState(false)
  const [providers, setProviders] = useState<Providers>({})
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    api<Providers>('GET', '/auth/providers').then(setProviders).catch(() => {})
  }, [])

  async function submit() {
    setBusy(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login' ? { email: f.email, password: f.password } : { ...f, lang: getLang() }
      const r = await api<{ token: string; user: User }>('POST', path, body)
      setTok(r.token); onAuth(r.user)
    } catch (e: any) { toastErr(e.message) } finally { setBusy(false) }
  }

  function startOAuth(provider: ProviderKey) {
    window.location.href = API.replace(/\/$/, '') + `/auth/${provider}`
  }

  const enabled = PROVIDER_ORDER.filter((p) => providers[p])

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden>
        <img src="/auth-bg.png" alt="" />
      </div>
      <div className="auth auth-glass">
        <div className="logo-big"><b /></div>
        <h1>Planii</h1>
        {/* Tagline kept in i18n as auth.tagline — not shown on auth screen */}
        <LangFlags />

        {onBack && (
          <button type="button" className="btn-link" style={{ marginBottom: 12 }} onClick={onBack}>
            {tt('pd.back')}
          </button>
        )}

        {enabled.length > 0 && (
          <div className="auth-social">
            <p className="auth-social-title">{tr('auth.login')}</p>
            <div className="auth-social-row" role="group" aria-label={tr('auth.login')}>
              {enabled.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className={`auth-social-btn auth-${provider}`}
                  aria-label={tr(PROVIDER_LABEL[provider])}
                  title={tr(PROVIDER_LABEL[provider])}
                  onClick={() => startOAuth(provider)}
                >
                  <ProviderIcon provider={provider} />
                </button>
              ))}
            </div>
            <div className="auth-or"><span>{tr('auth.orEmail')}</span></div>
          </div>
        )}

        {mode === 'signup' && (
          <>
            <div className="field"><label>{tr('auth.name')}</label>
              <MicInput value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Ex. Awa Ndiaye" /></div>
            <div className="field"><label>{tr('auth.job')}</label>
              <MicInput value={f.job} onChange={(v) => setF({ ...f, job: v })} placeholder="Ex. Développeur, Consultant…" maxLength={60} /></div>
          </>
        )}
        <div className="field"><label>{tr('auth.email')}</label>
          <input type="email" value={f.email} onChange={set('email')} placeholder="vous@exemple.com" /></div>
        <div className="field"><label>{tr('auth.password')}</label>
          <input type="password" value={f.password} onChange={set('password')} placeholder="••••••••" /></div>
        <button className="btn primary block" disabled={busy} onClick={submit}>
          {busy ? '…' : mode === 'login' ? tr('auth.login') : tr('auth.signup')}
        </button>
        <p className="switch">
          {mode === 'login'
            ? <>{tr('auth.noAccount')} <button className="btn-link" onClick={() => setMode('signup')}>{tr('auth.register')}</button></>
            : <>{tr('auth.hasAccount')} <button className="btn-link" onClick={() => setMode('login')}>{tr('auth.login')}</button></>}
        </p>
        <p className="auth-support">{tr('auth.support')} <a href="mailto:info@planii.app">info@planii.app</a></p>
        <p className="auth-support"><a href="/confidentialite">{tr('auth.privacy')}</a></p>
      </div>
    </div>
  )
}
