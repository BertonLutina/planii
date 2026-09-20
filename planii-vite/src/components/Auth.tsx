import { useEffect, useState } from 'react'
import { api, setTok } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { MicInput } from './Mic'
import type { User } from '@/lib/types'
import { useI18n, LangPicker, getLang, t as tt } from '@/lib/i18n'

const API = (import.meta.env.VITE_API_URL as string) || 'https://api.planii.app/api'

type ProviderKey = 'google' | 'microsoft' | 'linkedin' | 'yahoo'
type Providers = Partial<Record<ProviderKey, boolean>>
type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'

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

export function Auth({ onAuth, initialMode = 'login', onBack, resetToken = '' }: {
  onAuth: (u: User) => void
  /** Ouvre directement sur l'inscription — utilisé par « Commencer gratuitement » de la landing. */
  initialMode?: AuthMode
  /** Retour à la page d'accueil publique. Absent = pas de bouton retour. */
  onBack?: () => void
  /** Jeton du lien reçu par e-mail, pour l'écran « nouveau mot de passe ». */
  resetToken?: string
}) {
  const { t: tr } = useI18n()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [providers, setProviders] = useState<Providers>({})
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    api<Providers>('GET', '/auth/providers').then(setProviders).catch(() => {})
  }, [])

  function go(next: AuthMode) {
    setMode(next)
    setSent(false)
    setBusy(false)
  }

  async function submit() {
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await api('POST', '/auth/forgot-password', { email: f.email })
        setSent(true)
        return
      }
      if (mode === 'reset') {
        if (!resetToken) { toastErr(tr('auth.resetInvalid')); return }
        if (f.password.length < 8) { toastErr(tr('auth.resetShort')); return }
        if (f.password !== f.confirm) { toastErr(tr('auth.resetMismatch')); return }
        await api('POST', '/auth/reset-password', { token: resetToken, password: f.password })
        toast(tr('auth.resetOk'))
        setTok(null)
        setF({ ...f, password: '', confirm: '' })
        go('login')
        onBack?.()
        return
      }
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login' ? { email: f.email, password: f.password } : { name: f.name, email: f.email, password: f.password, lang: getLang() }
      const r = await api<{ token: string; user: User }>('POST', path, body)
      setTok(r.token); onAuth(r.user)
    } catch (e: any) { toastErr(e.message) } finally { setBusy(false) }
  }

  function startOAuth(provider: ProviderKey) {
    window.location.href = API.replace(/\/$/, '') + `/auth/${provider}`
  }

  const enabled = PROVIDER_ORDER.filter((p) => providers[p])
  const title = mode === 'signup' ? tr('auth.register')
    : mode === 'forgot' ? tr('auth.forgotTitle')
    : mode === 'reset' ? tr('auth.resetTitle')
    : tr('auth.login')
  const sub = mode === 'signup' ? tr('auth.startSub')
    : mode === 'forgot' ? tr('auth.forgotSub')
    : mode === 'reset' ? tr('auth.resetSub')
    : tr('auth.welcomeBack')
  const back = mode === 'forgot' ? () => go('login')
    : mode === 'reset' ? () => { go('login'); onBack?.() }
    : onBack

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden>
        <img src="/auth-bg.png" alt="" />
      </div>
      <div className="auth auth-glass">
        {back && (
          <button type="button" className="btn-link auth-back" onClick={back}>{tt('pd.back')}</button>
        )}

        {/* Verrou de marque : tuile et nom solidaires, centrés — identique au mobile. */}
        <div className="auth-lockup">
          <span className="logo"><b /></span>
          <h1>Planii</h1>
        </div>

        {/* Le titre porte l'action ; la ligne en dessous accueille, elle n'explique
            pas le produit. L'accroche est sur la page d'accueil publique. */}
        <div className="auth-head">
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>

        {/* La langue avant les fournisseurs : c'est le seul moment où quelqu'un
            arrivé dans la mauvaise langue peut en sortir. */}
        <LangPicker />

        {mode !== 'forgot' && mode !== 'reset' && enabled.length > 0 && (
          <div className="auth-social">
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

        {mode === 'forgot' && sent ? (
          <p className="auth-sent">{tr('auth.forgotSent')}</p>
        ) : (
          <>
            {mode === 'signup' && (
              <div className="field"><label>{tr('auth.name')}</label>
                <MicInput value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Ex. Awa Ndiaye" /></div>
            )}
            {mode !== 'reset' && (
              <div className="field"><label>{tr('auth.email')}</label>
                <input type="email" value={f.email} onChange={set('email')} placeholder="vous@exemple.com" autoComplete="email" onKeyDown={(e) => { if (e.key === 'Enter') submit() }} /></div>
            )}
            {(mode === 'login' || mode === 'signup') && (
              <div className="field"><label>{tr('auth.password')}</label>
                <input type="password" value={f.password} onChange={set('password')} placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} /></div>
            )}
            {mode === 'login' && (
              <p className="auth-forgot">
                <button type="button" className="btn-link" onClick={() => go('forgot')}>{tr('auth.forgot')}</button>
              </p>
            )}
            {mode === 'reset' && (
              <>
                <div className="field"><label>{tr('auth.resetPassword')}</label>
                  <input type="password" value={f.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" onKeyDown={(e) => { if (e.key === 'Enter') submit() }} /></div>
                <div className="field"><label>{tr('auth.resetConfirm')}</label>
                  <input type="password" value={f.confirm} onChange={set('confirm')} placeholder="••••••••" autoComplete="new-password" onKeyDown={(e) => { if (e.key === 'Enter') submit() }} /></div>
              </>
            )}
            <button className="btn primary block" disabled={busy} onClick={submit}>
              {busy ? '…' : mode === 'signup' ? tr('auth.signup')
                : mode === 'forgot' ? tr('auth.forgotSubmit')
                : mode === 'reset' ? tr('auth.resetSubmit')
                : tr('auth.login')}
            </button>
          </>
        )}

        {mode !== 'forgot' && mode !== 'reset' && (
          <p className="switch">
            {mode === 'login'
              ? <>{tr('auth.noAccount')} <button className="btn-link" onClick={() => go('signup')}>{tr('auth.register')}</button></>
              : <>{tr('auth.hasAccount')} <button className="btn-link" onClick={() => go('login')}>{tr('auth.login')}</button></>}
          </p>
        )}

        {mode === 'forgot' && sent && (
          <p className="switch">
            <button type="button" className="btn-link" onClick={() => go('login')}>{tr('auth.forgotBack')}</button>
          </p>
        )}

        {/* Mentions : après l'action, sur une seule ligne. */}
        <div className="auth-foot">
          <a href="/confidentialite">{tr('auth.privacy')}</a>
          <i aria-hidden />
          <a href="mailto:info@planii.app">{tr('auth.help')}</a>
        </div>
      </div>
    </div>
  )
}
