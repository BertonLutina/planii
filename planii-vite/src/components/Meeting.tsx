import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Avatar, toast, toastErr } from '@/lib/ui'
import { canManage } from '@/lib/dates'
import { PRIORITIES } from '@/lib/priority'
import { useRealtime } from '@/lib/realtime'
import type { Project, User } from '@/lib/types'
import { useI18n, trTerm } from '@/lib/i18n'

declare global { interface Window { JitsiMeetExternalAPI?: any } }

interface MeetingMessage {
  id: string
  userId: string
  userName: string
  body: string
  createdTaskId?: string | null
  at: string
}

export function Meeting({ p, me, onClose }: { p: Project; me: User; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const [messages, setMessages] = useState<MeetingMessage[]>([])
  const [text, setText] = useState('')
  const { t: tr } = useI18n()
  const [tab, setTab] = useState<'chat' | 'tasks'>('chat')
  const [draft, setDraft] = useState({ title: '', assigneeId: '', statusKey: 'todo', priority: 3, messageId: '', transferable: false })
  const [busy, setBusy] = useState(false)
  const [delegates, setDelegates] = useState<string[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const manage = canManage(p.my_role)
  const canCreateTasks = manage || delegates.includes(me.id)

  const loadMessages = useCallback(() => {
    api<{ messages: MeetingMessage[] }>('GET', '/projects/' + p.id + '/meeting/messages')
      .then((r) => setMessages(r.messages))
      .catch((e) => toastErr(e.message))
  }, [p.id])

  const loadDelegates = useCallback(() => {
    api<{ userIds: string[] }>('GET', '/projects/' + p.id + '/meeting/task-delegates')
      .then((r) => setDelegates(r.userIds))
      .catch(() => setDelegates([]))
  }, [p.id])

  useEffect(loadMessages, [loadMessages])
  useEffect(loadDelegates, [loadDelegates])
  useRealtime((m) => {
    if (m.type === 'meeting_chat' && m.projectId === p.id) {
      loadMessages()
      loadDelegates()
    }
  })

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    let cancelled = false
    const start = () => {
      if (cancelled || !ref.current || !window.JitsiMeetExternalAPI) return
      try {
        apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName: 'planii-' + p.id,
          parentNode: ref.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: me.name },
          configOverwrite: { prejoinPageEnabled: false },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        })
      } catch { /* ignore */ }
    }
    if (window.JitsiMeetExternalAPI) start()
    else {
      const s = document.createElement('script')
      s.src = 'https://meet.jit.si/external_api.js'; s.async = true; s.onload = start
      document.body.appendChild(s)
    }
    return () => { cancelled = true; try { apiRef.current?.dispose() } catch { /* ignore */ } }
  }, [p.id, me.name])

  async function send() {
    const body = text.trim()
    if (!body) return
    setText('')
    try { await api('POST', '/projects/' + p.id + '/meeting/messages', { body }); loadMessages() }
    catch (e: any) { toastErr(e.message); setText(body) }
  }

  function startTaskFromMessage(msg: MeetingMessage) {
    setTab('tasks')
    setDraft((d) => ({ ...d, title: inferTaskTitle(msg.body), messageId: msg.id }))
  }

  async function toggleDelegate(userId: string) {
    const next = delegates.includes(userId) ? delegates.filter((id) => id !== userId) : [...delegates, userId]
    setDelegates(next)
    try {
      const r = await api<{ userIds: string[] }>('PUT', '/projects/' + p.id + '/meeting/task-delegates', { userIds: next })
      setDelegates(r.userIds)
      toast(tr('meet.accessUpdated'))
    } catch (e: any) {
      toastErr(e.message)
      loadDelegates()
    }
  }

  async function createTask() {
    if (!canCreateTasks) return toastErr('Le chef du projet doit vous autoriser à créer des tâches depuis ce meeting')
    if (!draft.title.trim()) return toastErr(tr('meet.titleReq'))
    setBusy(true)
    try {
      await api('POST', '/projects/' + p.id + '/meeting/tasks', {
        title: draft.title.trim(),
        assigneeId: draft.assigneeId || null,
        statusKey: draft.statusKey,
        priority: draft.priority,
        messageId: draft.messageId || null,
        transferable: draft.transferable,
      })
      toast(tr('meet.taskCreated'))
      setDraft({ title: '', assigneeId: '', statusKey: 'todo', priority: 3, messageId: '', transferable: false })
      setTab('chat')
      loadMessages()
    } catch (e: any) { toastErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="meet meet-plus">
      <div className="meet-bar">
        <div className="meet-title">
          <span className="mt">{tr('meet.title')} — {p.name}</span>
          <span className="meet-sub">{p.members.length} {tr('meet.guests')}</span>
        </div>
        <button className="btn sm" onClick={onClose}>{tr('meet.quit')}</button>
      </div>
      <div className="meet-layout">
        <div className="meet-main">
          <div id="jitsi-container" ref={ref} className="jitsi-frame" />
          <div className="meet-invites">
            <div>
              <b>{tr('meet.autoInvited')}</b>
              <p>{tr('meet.autoDesc')}</p>
            </div>
            <div className="meet-invite-list">
              {p.members.map((m) => <span key={m.id} className="meet-person"><Avatar name={m.name} />{m.name}</span>)}
            </div>
          </div>
        </div>
        <aside className="meet-chat-panel">
          <div className="meet-panel-head">
            <b>{tr('meet.discussion')}</b>
            <button onClick={onClose} aria-label={tr('action.close')}>×</button>
          </div>
          <div className="meet-tabs">
            <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>{tr('meet.chat')}</button>
            <button className={tab === 'tasks' ? 'on' : ''} onClick={() => setTab('tasks')}>{tr('meet.tasks')}</button>
          </div>
          {tab === 'chat' ? (
            <>
              <div className="meet-messages" ref={listRef}>
                {messages.length === 0 && <div className="empty" style={{ padding: 18 }}>{tr('meet.noMsg')}</div>}
                {messages.map((msg) => (
                  <div key={msg.id} className="meet-msg">
                    <Avatar name={msg.userName} size={30} />
                    <div className="meet-msg-body">
                      <div className="meet-msg-meta"><b>{msg.userName}</b><span>{new Date(msg.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span></div>
                      <div className="meet-bubble">{msg.body}</div>
                      {msg.createdTaskId ? (
                        <div className="meet-task-made">{tr('meet.taskMade')}</div>
                      ) : canCreateTasks && (
                        <button className="meet-create-link" onClick={() => startTaskFromMessage(msg)}>{tr('meet.makeTask')}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="meet-input">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('meet.write')} onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
                <button className="btn primary sm" onClick={send}>{tr('meet.send')}</button>
              </div>
            </>
          ) : (
            <div className="meet-task-composer">
              {manage && (
                <div className="meet-delegates">
                  <div>
                    <b>{tr('meet.allowed')}</b>
                    <p>{tr('meet.allowedDesc')}</p>
                  </div>
                  <div className="meet-delegate-list">
                    {p.members.map((m) => (
                      <label key={m.id} className="meet-delegate">
                        <input type="checkbox" checked={delegates.includes(m.id)} onChange={() => toggleDelegate(m.id)} />
                        <Avatar name={m.name} size={24} />
                        <span>{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {!canCreateTasks && <div className="banner" style={{ margin: 0 }}>{tr('meet.needAuth')}</div>}
              <div className="field"><label>{tr('meet.titleField')}</label><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex. Vérifier les photos" /></div>
              <div className="field"><label>{tr('td.assignee')}</label>
                <select value={draft.assigneeId} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}>
                  <option value="">{tr('meet.toTake')}</option>
                  {p.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select></div>
              <div className="field"><label>{tr('meet.status')}</label>
                <select value={draft.statusKey} onChange={(e) => setDraft({ ...draft, statusKey: e.target.value })}>
                  {(p.statuses || []).map((s) => <option key={s.key} value={s.key} disabled={s.key === 'transferred' && !draft.transferable}>{trTerm(s.label)}</option>)}
                </select></div>
              <div className="field"><label>{tr('td.priority')}</label>
                <div className="prio-pick">{PRIORITIES.map((n) => <button key={n} className={draft.priority === n ? 'on o' + n : ''} onClick={() => setDraft({ ...draft, priority: n })}>P{n}</button>)}</div></div>
              <label className="checkline"><input type="checkbox" checked={draft.transferable} onChange={(e) => setDraft({ ...draft, transferable: e.target.checked, statusKey: e.target.checked ? draft.statusKey : (draft.statusKey === 'transferred' ? 'todo' : draft.statusKey) })} /> {tr('meet.transferable')}</label>
              <button className="btn primary block" disabled={!canCreateTasks || busy} onClick={createTask}>{tr('action.add')}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function inferTaskTitle(body: string) {
  const clean = body.trim().replace(/\s+/g, ' ')
  if (clean.length <= 56) return clean
  return clean.slice(0, 53).trim() + '…'
}
