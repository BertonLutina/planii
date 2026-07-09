import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toast, toastErr } from '@/lib/ui'
import { PRIORITIES, prioMeta } from '@/lib/priority'
import { taskTypesOf, typeTone } from '@/lib/tasktype'
import { formatDue } from '@/lib/dates'
import {
  listen, speak, stopSpeaking, speechSupported,
  parsePriority, parseDueDate, matchFromList, saysNobody, saysNone, saysMe, type Recognizer,
} from '@/lib/speech'
import type { Project, User } from '@/lib/types'

type StepKey = 'title' | 'priority' | 'type' | 'assignee' | 'due' | 'review'
const STEPS: StepKey[] = ['title', 'priority', 'type', 'assignee', 'due', 'review']
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

/** Assistant vocal guidé : crée une tâche champ par champ à la voix. */
export function VoiceTaskWizard({ p, me, onClose, onCreated }: { p: Project; me: User; onClose: () => void; onCreated: () => void }) {
  const myTypes = taskTypesOf(me)
  const roles = p.roles || []
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ title: '', priority: 6, type: myTypes[0] || '', assigneeId: '', due: '' })
  const [heard, setHeard] = useState('')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const recRef = useRef<Recognizer | null>(null)
  const key = STEPS[step]

  const PROMPTS: Record<StepKey, string> = {
    title: 'Quel est l’intitulé de la tâche ?',
    priority: 'Quelle priorité ? De 1, la plus urgente, à 6, la plus basse.',
    type: 'Quel type ? Par exemple ' + (myTypes.slice(0, 3).join(', ') || 'tâche, bug') + ', ou aucun.',
    assignee: 'Qui est responsable ? Dites un nom, un rôle, moi, ou personne.',
    due: 'Pour quelle date ? Par exemple demain, vendredi, dans trois jours, ou aucune.',
    review: 'Voici la tâche. Vous pouvez la créer ou corriger.',
  }

  // à chaque étape : énonce la question, arrête l'écoute précédente
  useEffect(() => {
    recRef.current?.stop(); setListening(false); setHeard('')
    speak(PROMPTS[key])
    return () => { recRef.current?.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => () => { recRef.current?.stop(); stopSpeaking() }, [])

  const memberName = (id: string) => p.members.find((m) => m.id === id)?.name || ''

  function apply(text: string) {
    if (key === 'title') setF((v) => ({ ...v, title: cap(text.trim()) }))
    else if (key === 'priority') { const n = parsePriority(text); if (n) setF((v) => ({ ...v, priority: n })) }
    else if (key === 'type') {
      if (saysNone(text)) setF((v) => ({ ...v, type: '' }))
      else { const m = matchFromList(text, myTypes, (t) => t); if (m) setF((v) => ({ ...v, type: m })) }
    } else if (key === 'assignee') {
      if (saysNobody(text)) setF((v) => ({ ...v, assigneeId: '' }))
      else if (saysMe(text) && p.members.some((m) => m.id === me.id)) setF((v) => ({ ...v, assigneeId: me.id }))
      else {
        const byName = matchFromList(text, p.members, (m) => m.name)
        if (byName) setF((v) => ({ ...v, assigneeId: byName.id }))
        else {
          const role = matchFromList(text, roles, (r) => r.name)
          const holder = role && p.members.find((m) => (m.roleIds || []).includes(role.id))
          if (holder) setF((v) => ({ ...v, assigneeId: holder.id }))
          else toastErr('Personne trouvée pour « ' + text + ' »')
        }
      }
    } else if (key === 'due') { const d = parseDueDate(text); if (d !== null) setF((v) => ({ ...v, due: d })) }
  }

  function startListen() {
    if (!speechSupported()) { toastErr('Reconnaissance vocale indisponible sur ce navigateur'); return }
    if (listening) { recRef.current?.stop(); return }
    stopSpeaking(); setListening(true); setHeard('')
    recRef.current = listen({
      onText: (t) => setHeard(t),
      onFinal: (t) => { if (t) apply(t) },
      onEnd: () => setListening(false),
      onError: (e) => { setListening(false); if (e === 'unsupported') toastErr('Reconnaissance vocale indisponible') },
    })
  }

  async function create() {
    if (!f.title.trim()) { toastErr('L’intitulé est obligatoire'); return }
    setBusy(true)
    try {
      await api('POST', '/projects/' + p.id + '/tasks', {
        title: f.title.trim(), type: f.type || null, priority: f.priority,
        assigneeId: f.assigneeId || null, due: f.due || null,
      })
      toast('Tâche créée à la voix ✓'); onCreated()
    } catch (e: any) { toastErr(e.message); setBusy(false) }
  }

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))
  const canNext = key !== 'title' || f.title.trim().length > 0

  return (
    <Modal title="🎤 Tâche à la voix" onClose={onClose}>
      <div className="vw-steps">
        {STEPS.map((k, i) => <span key={k} className={'vw-dot' + (i === step ? ' on' : i < step ? ' done' : '')} />)}
      </div>
      <p className="sub" style={{ marginTop: 0 }}>Étape {step + 1}/{STEPS.length}</p>

      {key !== 'review' ? (
        <>
          <p className="vw-q">{PROMPTS[key]}</p>
          <div className="vw-mic-row">
            <button className={'vw-mic' + (listening ? ' on' : '')} onClick={startListen} aria-label="Parler">
              {listening ? <span className="mic-pulse" /> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              )}
            </button>
            <span className="vw-hint">{listening ? 'À l’écoute…' : 'Appuyez et parlez'}</span>
          </div>
          {heard && <p className="vw-heard">« {heard} »</p>}

          {/* correction manuelle */}
          <div className="vw-manual">
            {key === 'title' && <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Intitulé de la tâche" />}
            {key === 'priority' && (
              <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={f.priority === n ? 'on o' + n : ''} onClick={() => setF({ ...f, priority: n })}>P{n}</button>)}</div>
            )}
            {key === 'type' && (
              <div className="type-pick">
                <button className={f.type === '' ? 'on' : ''} onClick={() => setF({ ...f, type: '' })}>Aucun</button>
                {myTypes.map((t) => <button key={t} className={f.type === t ? 'on ' + typeTone(t) : ''} onClick={() => setF({ ...f, type: t })}>{t}</button>)}
              </div>
            )}
            {key === 'assignee' && (
              <select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
                <option value="">— À prendre (non assignée)</option>
                {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === me.id ? ' (moi)' : ''}</option>)}
              </select>
            )}
            {key === 'due' && <input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />}
          </div>
        </>
      ) : (
        <div className="vw-review">
          <div className="vw-line"><span>Intitulé</span><b>{f.title || <em className="sub">(vide)</em>}</b></div>
          <div className="vw-line"><span>Priorité</span><b><span className={'pflag ' + prioMeta(f.priority).flagCls}>{prioMeta(f.priority).tag}</span></b></div>
          <div className="vw-line"><span>Type</span><b>{f.type ? <span className={'ttype ' + typeTone(f.type)}>{f.type}</span> : <span className="sub">aucun</span>}</b></div>
          <div className="vw-line"><span>Responsable</span><b>{f.assigneeId ? memberName(f.assigneeId) : <span className="sub">à prendre</span>}</b></div>
          <div className="vw-line"><span>Échéance</span><b>{f.due ? formatDue(f.due) : <span className="sub">aucune</span>}</b></div>
        </div>
      )}

      <div className="sheet-actions" style={{ marginTop: 14 }}>
        {step > 0 && <button className="btn ghost" onClick={prev}>‹ Précédent</button>}
        {key !== 'review'
          ? <button className="btn primary" disabled={!canNext} onClick={next}>Suivant ›</button>
          : <button className="btn primary" disabled={busy} onClick={create}>{busy ? 'Création…' : '✓ Créer la tâche'}</button>}
      </div>
    </Modal>
  )
}
