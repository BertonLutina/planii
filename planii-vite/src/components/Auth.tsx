import { useState } from 'react'
import { api, setTok } from '@/lib/api'
import { toastErr } from '@/lib/ui'
import { MicInput } from './Mic'
import type { User } from '@/lib/types'
import { useI18n, LangFlags } from '@/lib/i18n'

export function Auth({ onAuth }: { onAuth: (u: User) => void }) {
  const { t: tr } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [f, setF] = useState({ name: '', email: '', password: '', job: '' })
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function submit() {
    setBusy(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login' ? { email: f.email, password: f.password } : f
      const r = await api<{ token: string; user: User }>('POST', path, body)
      setTok(r.token); onAuth(r.user)
    } catch (e: any) { toastErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <div className="logo-big"><b /></div>
      <h1>Planii</h1>
      <p className="tag">{tr('auth.tagline')}</p>
      <LangFlags />
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
  )
}
