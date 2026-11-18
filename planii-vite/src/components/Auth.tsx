import { useEffect, useState, useRef } from 'react'
import { api, setTok } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { applyTheme, effectiveTheme, getTheme } from '@/lib/theme'
import { Ic } from './Icon'
import type { User } from '@/lib/types'
import { useI18n, LangPicker, getLang, t as tt } from '@/lib/i18n'

const API = (import.meta.env.VITE_API_URL as string) || 'https://api.planii.app/api'

type ProviderKey = 'google' | 'microsoft' | 'linkedin' | 'yahoo'
type Providers = Partial<Record<ProviderKey, boolean>>
type AuthMode = 'login' | 'signup' | 'forgot' | 'reset'

const PROVIDER_ORDER: ProviderKey[] = ['google', 'microsoft', 'linkedin', 'yahoo']

const PROVIDER_NAME: Record<ProviderKey, string> = { google: 'Google', microsoft: 'Microsoft', linkedin: 'LinkedIn', yahoo: 'Yahoo' }

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
  // Reset : lien absent/expiré/déjà utilisé → écran dédié avec action ; erreur de saisie → message annoncé près du champ.
  const emailRef = useRef<HTMLInputElement>(null)
  const [linkBad, setLinkBad] = useState(false)
  const [fieldErr, setFieldErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [providers, setProviders] = useState<Providers>({})
  const [showPw, setShowPw] = useState(false)
  const [dark, setDark] = useState(() => effectiveTheme(getTheme()) === 'dark')
  const flip = () => { const next = dark ? 'light' : 'dark'; applyTheme(next); setDark(next === 'dark') }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    api<Providers>('GET', '/auth/providers').then(setProviders).catch(() => {})
  }, [])

  function go(next: AuthMode) {
    setMode(next)
    setSent(false)
    setBusy(false)
    setLinkBad(false)
    setFieldErr(null)
    setShowPw(false)
  }

  // Le champ e-mail est le même nœud DOM en connexion et en « oublié » : autoFocus ne se redéclencherait pas.
  useEffect(() => { if (mode === 'forgot' && !sent) emailRef.current?.focus() }, [mode, sent])

  async function submit() {
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await api('POST', '/auth/forgot-password', { email: f.email })
        setSent(true)
        return
      }
      if (mode === 'reset') {
        if (!resetToken) { setLinkBad(true); return }
        if (f.password.length < 8) { setFieldErr(tr('auth.resetShort')); return }
        if (f.password !== f.confirm) { setFieldErr(tr('auth.resetMismatch')); return }
        setFieldErr(null)
        try {
          await api('POST', '/auth/reset-password', { token: resetToken, password: f.password })
        } catch (e: any) {
          // « Lien invalide ou expiré » (jeton périmé, déjà utilisé, inconnu) : écran dédié. Autres erreurs : on garde le formulaire.
          if (/lien invalide|invalid|expir/i.test(String(e?.message))) { setLinkBad(true); return }
          throw e
        }
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

  const signup = mode === 'signup'
  const pwType = showPw ? 'text' : 'password'
  const eye = (
    <button type="button" tabIndex={-1} className="au-eye" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}
      aria-label={showPw ? tr('au.hidePw') : tr('au.showPw')} title={showPw ? tr('au.hidePw') : tr('au.showPw')}>
      <Ic name={showPw ? 'eye-off' : 'eye'} s={18} />
    </button>
  )
  const strength = (() => {
    const v = f.password
    if (!v) return 0
    let n = 0
    if (v.length >= 8) n++
    if (/\d/.test(v)) n++
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++
    if (v.length >= 12) n++
    return Math.max(1, n)
  })()

  return (
    <div className="lp au">
      <div className="lp-glow" aria-hidden><i className="a" /><i className="b" /><i className="c" /></div>
      <div className="au-page">
        <header className="au-bar">
          <span className="lp-brand" aria-label="Planii">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <defs><linearGradient id="au-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--lp-logo-a)" /><stop offset="1" stopColor="var(--lp-logo-b)" /></linearGradient></defs>
              <rect x="12" y="10" width="58" height="21" rx="10.5" fill="url(#au-logo)" />
              <rect x="15.5" y="43" width="69" height="14" rx="7" fill="none" stroke="url(#au-logo)" strokeWidth="7" />
              <rect x="12" y="69" width="40" height="21" rx="10.5" fill="url(#au-logo)" />
            </svg>
            <span>Planii</span>
          </span>
          <span className="au-sp" />
          {back && <button type="button" className="au-link auth-back" onClick={back}>{tt('pd.back')}</button>}
          <LangPicker />
          <button type="button" className="lp-tbtn" onClick={flip} aria-label={tr('theme.title')} title={tr('theme.title')}>
            <Ic name={dark ? 'sun' : 'moon'} s={17} />
          </button>
        </header>

        <div className="au-main">
          <section className="au-hero">
            <span className="lp-eyebrow"><i />{tr('au.badge')}</span>
            <h1>{signup ? tr('au.s1') : tr('au.h1')} <em>{signup ? tr('au.s2') : tr('au.h2')}</em></h1>
            <p className="au-lead">{tr('au.lead')}</p>
            <div className="au-trust"><span>{tr('au.t1')}</span><span>{tr('au.t2')}</span><span>{tr('au.t3')}</span></div>
            <div className="au-wins" aria-hidden>
              <div className="au-win">
                <header><i /><i /><i /><span>{tr('au.win1')}</span></header>
                <div className="bd">
                  <div className="au-tags"><span className="dg">{tr('au.tagLate')}</span><span className="wn">{tr('au.tagToday')}</span><span className="ok">{tr('au.tagDone')}</span></div>
                  <div className="au-tk"><span className="ck" /><span className="t">{tr('au.task1')}</span><span className="p p1">P1</span><span className="av">AM</span></div>
                  <div className="au-tk"><span className="ck" /><span className="t">{tr('au.task2')}</span><span className="p p2">P2</span><span className="av">LK</span></div>
                </div>
              </div>
              <div className="au-win au-score">
                <header><i /><i /><i /><span>{tr('au.win2')}</span></header>
                <div className="bd">
                  <small>{tr('au.win2')}</small>
                  <strong>1 240<sup>pts</sup></strong>
                  <div className="pb"><i /></div>
                  <em>{tr('au.next')}</em>
                </div>
              </div>
            </div>
          </section>

          <main className="au-card">
            {mode !== 'forgot' && mode !== 'reset' && (
              <div className="au-tabs">
                <button type="button" aria-pressed={mode === 'login'} onClick={() => go('login')}>{tr('auth.login')}</button>
                <button type="button" aria-pressed={mode === 'signup'} onClick={() => go('signup')}>{tr('auth.register')}</button>
              </div>
            )}

            <div className="au-head">
              <h2>{title}</h2>
              <p>{sub}</p>
            </div>

            {mode === 'forgot' && sent ? (
              <p className="au-sent" role="status"><Ic name="mail" s={18} /><span>{tr('auth.forgotSent')}</span></p>
            ) : mode === 'reset' && (linkBad || !resetToken) ? (
              <>
                <p className="au-sent bad" role="alert">{tr('auth.resetInvalid')}</p>
                <button type="button" className="lp-btn pri au-go" autoFocus onClick={() => go('forgot')}>{tr('auth.resetNewLink')}</button>
              </>
            ) : (
              <>
                {mode === 'signup' && (
                  <div className="au-fld"><label htmlFor="au-name">{tr('auth.name')}</label>
                    <div className="au-inp"><input id="au-name" type="text" value={f.name} onChange={set('name')} placeholder="Ex. Awa Ndiaye" autoComplete="name" /></div></div>
                )}
                {mode !== 'reset' && (
                  <div className="au-fld"><label htmlFor="au-email">{tr('auth.email')}</label>
                    <div className="au-inp"><input id="au-email" type="email" value={f.email} onChange={set('email')} placeholder="vous@exemple.com" autoComplete="email" ref={emailRef} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} /></div></div>
                )}
                {(mode === 'login' || mode === 'signup') && (
                  <div className="au-fld">
                    <label htmlFor="au-pw">{tr('auth.password')}</label>
                    <div className="au-inp pw"><input id="au-pw" type={pwType} value={f.password} onChange={set('password')} placeholder={signup ? tr('au.pwPh') : '••••••••'} autoComplete={signup ? 'new-password' : 'current-password'} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />{eye}</div>
                    {mode === 'login' && <p className="au-forgot"><button type="button" className="au-link sm" onClick={() => go('forgot')}>{tr('auth.forgot')}</button></p>}
                    {signup && (
                      <>
                        <div className="au-meter" data-s={strength} aria-hidden><i /><i /><i /><i /></div>
                        <p className="au-hint">{tr('au.pwHint')}</p>
                      </>
                    )}
                  </div>
                )}
                {mode === 'reset' && (
                  <>
                    <div className="au-fld"><label htmlFor="au-new">{tr('auth.resetPassword')}</label>
                      <div className="au-inp pw"><input id="au-new" type={pwType} value={f.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" autoFocus aria-describedby="pw-hint" aria-invalid={!!fieldErr || undefined} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />{eye}</div>
                      <p id="pw-hint" className="au-hint">{tr('auth.resetHint')}</p></div>
                    <div className="au-fld"><label htmlFor="au-confirm">{tr('auth.resetConfirm')}</label>
                      <div className="au-inp"><input id="au-confirm" type={pwType} value={f.confirm} onChange={set('confirm')} placeholder="••••••••" autoComplete="new-password" aria-invalid={!!fieldErr || undefined} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} /></div></div>
                  </>
                )}
                {mode === 'reset' && fieldErr && <p className="au-err" role="alert">{fieldErr}</p>}
                <button type="button" className="lp-btn pri au-go" disabled={busy} onClick={submit}>
                  {busy ? '…' : <>{mode === 'signup' ? tr('auth.signup')
                    : mode === 'forgot' ? tr('auth.forgotSubmit')
                    : mode === 'reset' ? tr('auth.resetSubmit')
                    : tr('auth.login')}{(mode === 'login' || mode === 'signup') && <Ic name="arrow-right" s={17} />}</>}
                </button>
              </>
            )}

            {mode !== 'forgot' && mode !== 'reset' && enabled.length > 0 && (
              <div className="au-social">
                <div className="au-or"><span>{tr('auth.orEmail')}</span></div>
                <div className="au-prov" role="group" aria-label={tr('auth.login')}>
                  {enabled.map((provider) => (
                    <button key={provider} type="button" className={`au-pbtn auth-${provider}`} aria-label={tr(PROVIDER_LABEL[provider])} title={tr(PROVIDER_LABEL[provider])} onClick={() => startOAuth(provider)}>
                      <ProviderIcon provider={provider} />{PROVIDER_NAME[provider]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'forgot' && sent && (
              <p className="au-note">
                <button type="button" className="au-link sm" onClick={() => go('login')}>{tr('auth.forgotBack')}</button>
              </p>
            )}
            {mode === 'forgot' && !sent && (
              <p className="au-note">
                <button type="button" className="au-link sm" onClick={() => go('login')}>{tr('auth.forgotBack')}</button>
              </p>
            )}

            <div className="au-foot">
              <a href="/confidentialite">{tr('auth.privacy')}</a>
              <a href="mailto:info@planii.app">{tr('auth.help')}</a>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
