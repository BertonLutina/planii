import { useState } from 'react'
import { api, setTok } from '@/lib/api'
import { toastErr } from '@/lib/ui'
import { MicInput } from './Mic'
import type { User } from '@/lib/types'

export function Auth({ onAuth }: { onAuth: (u: User) => void }) {
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
      <p className="tag">Projets partagés : clients, prestataires et groupes — tâches, invitations, sondages, activité.</p>
      {mode === 'signup' && (
        <>
          <div className="field"><label>Nom (ou entreprise)</label>
            <MicInput value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Ex. Awa Ndiaye" /></div>
          <div className="field"><label>Métier (optionnel)</label>
            <MicInput value={f.job} onChange={(v) => setF({ ...f, job: v })} placeholder="Ex. Développeur, Consultant…" maxLength={60} /></div>
        </>
      )}
      <div className="field"><label>Email</label>
        <input type="email" value={f.email} onChange={set('email')} placeholder="vous@exemple.com" /></div>
      <div className="field"><label>Mot de passe</label>
        <input type="password" value={f.password} onChange={set('password')} placeholder="••••••••" /></div>
      <button className="btn primary block" disabled={busy} onClick={submit}>
        {busy ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
      </button>
      <p className="switch">
        {mode === 'login'
          ? <>Pas encore de compte ? <button className="btn-link" onClick={() => setMode('signup')}>S’inscrire</button></>
          : <>Déjà inscrit ? <button className="btn-link" onClick={() => setMode('login')}>Se connecter</button></>}
      </p>
    </div>
  )
}
