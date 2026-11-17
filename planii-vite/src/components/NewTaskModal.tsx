import { useEffect, useRef, useState } from 'react'
import { api, apiUploadProgress } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { PRIORITIES } from '@/lib/priority'
import { t as tt, trTerm } from '@/lib/i18n'
import type { Project, TaskAttachmentList, TaskStatus, User } from '@/lib/types'
import { PvDialog } from './PvDialog'
import { Ic } from './Icon'

const fmtSize = (n: number) =>
  n < 1024 ? `${n} o` : n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} Mo`

interface Picked { key: string; file: File; url: string | null; pct: number }

/**
 * Fenêtre « Nouvelle tâche » : titre, description, photos et fichiers, puis les propriétés.
 * Les fichiers sont envoyés juste après la création (la tâche doit exister pour les recevoir).
 */
export function NewTaskModal({ p, me, types, statuses, presetStatus, presetAssignee, onClose, onCreated }: {
  p: Project; me: User; types: string[]; statuses: TaskStatus[]
  presetStatus?: string; presetAssignee?: string
  onClose: () => void; onCreated: () => void
}) {
  const [f, setF] = useState({
    title: '', desc: '', type: types[0] || '', assigneeId: presetAssignee ?? '', due: '', est: '',
    priority: 6, statusKey: presetStatus && presetStatus !== 'transferred' ? presetStatus : 'todo', transferable: false,
  })
  const [files, setFiles] = useState<Picked[]>([])
  const [titleErr, setTitleErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const urls = useRef<string[]>([])
  useEffect(() => () => { urls.current.forEach((u) => URL.revokeObjectURL(u)) }, [])

  function pick(list: FileList | File[]) {
    const next: Picked[] = Array.from(list).map((file) => {
      const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      if (url) urls.current.push(url)
      return { key: Math.random().toString(36).slice(2), file, url, pct: 0 }
    })
    setFiles((l) => [...l, ...next])
  }

  async function submit() {
    if (!f.title.trim()) { setTitleErr(true); titleRef.current?.focus(); return }
    setBusy(true)
    let id = ''
    try {
      const r = await api<{ task: { id: string } }>('POST', '/projects/' + p.id + '/tasks', {
        title: f.title.trim(), description: f.desc.trim() || null, type: f.type || null,
        assigneeId: f.assigneeId || null, due: f.due || null, estHours: f.est || null,
        priority: f.priority, transferable: f.transferable,
        statusKey: f.statusKey !== 'todo' ? f.statusKey : undefined,
      })
      id = r.task.id
    } catch (e: any) { toastErr(e.message); setBusy(false); return }

    if (files.length) {
      try {
        const info = await api<TaskAttachmentList>('GET', '/tasks/' + id + '/attachments')
        for (const it of files) {
          const ext = it.file.name.split('.').pop()?.toLowerCase() || ''
          if (!info.accept.includes(ext)) { toastErr(tt('files.badType', { n: it.file.name })); continue }
          if (it.file.size > info.maxFileBytes) { toastErr(tt('files.tooBig', { n: it.file.name, max: fmtSize(info.maxFileBytes) })); continue }
          try {
            await apiUploadProgress('/tasks/' + id + '/attachments', it.file,
              (pct) => setFiles((l) => l.map((x) => (x.key === it.key ? { ...x, pct } : x))))
          } catch (e: any) { toastErr(`${it.file.name} : ${e.message}`) }
        }
      } catch (e: any) { toastErr(e.message) }
    }
    toast(tt('qt.created'))
    onCreated()
  }

  const statusOpts = statuses.filter((s) => s.key !== 'transferred')
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  return (
    <PvDialog
      title={tt('qt.title')}
      onClose={onClose}
      onSubmit={submit}
      footer={<>
        <button type="button" className="pv-btn ghost" onClick={onClose}>{tt('action.cancel')}</button>
        <button type="submit" className="pv-btn acc" disabled={busy}>{busy ? tt('common.loading') : tt('pv.create')}</button>
      </>}
    >
      <div className="pv-fld">
        <label htmlFor="nt-title">{tt('pv.title')}</label>
        <input id="nt-title" ref={titleRef} type="text" autoComplete="off" autoFocus value={f.title}
          placeholder={tt('pv.titlePh')} aria-invalid={titleErr} aria-describedby={titleErr ? 'nt-title-err' : undefined}
          onChange={(e) => { set('title', e.target.value); setTitleErr(false) }} />
        {titleErr && <span className="pv-err" id="nt-title-err" role="alert">{tt('pv.titleErr')}</span>}
      </div>
      <div className="pv-fld">
        <label htmlFor="nt-desc">{tt('pv.desc')}</label>
        <textarea id="nt-desc" rows={3} value={f.desc} placeholder={tt('pv.descPh')} onChange={(e) => set('desc', e.target.value)} />
      </div>

      <div className="pv-fld" role="group" aria-labelledby="nt-files-l">
        <span className="lbl" id="nt-files-l">{tt('pv.photos')}</span>
        <button type="button" className={'pv-dz' + (over ? ' over' : '')}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files) }}>
          <Ic name="upload" s={26} />
          <b>{tt('pv.dzAdd')}</b>
          <small>{tt('pv.dzHint')}</small>
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => { if (e.target.files) pick(e.target.files); e.target.value = '' }} />
        {files.length > 0 && (
          <div className="pv-flist">
            {files.map((it) => (
              <div className="pv-fitem" key={it.key}>
                <span className="pv-fth">{it.url ? <img alt="" src={it.url} /> : <Ic name="file" s={20} />}</span>
                <span className="pv-fn">
                  <b>{it.file.name}</b>
                  {busy && it.pct > 0 && it.pct < 100
                    ? <span className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={it.pct}><i style={{ width: it.pct + '%' }} /></span>
                    : <small>{fmtSize(it.file.size)}</small>}
                </span>
                {!busy && <button type="button" className="pv-ib" aria-label={tt('pv.removeFile', { n: it.file.name })} onClick={() => setFiles((l) => l.filter((x) => x.key !== it.key))}><Ic name="x" s={16} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pv-g2">
        <div className="pv-fld">
          <label htmlFor="nt-who">{tt('td.assignee')}</label>
          <select id="nt-who" value={f.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
            {p.members.map((m) => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}{m.id === me.id ? ' ' + tt('vw.me') : ''}</option>)}
            <option value="">{tt('pd.toTakeCap')}</option>
          </select>
        </div>
        <div className="pv-fld">
          <label htmlFor="nt-st">{tt('meet.status')}</label>
          <select id="nt-st" value={f.statusKey} onChange={(e) => set('statusKey', e.target.value)}>
            {statusOpts.map((s) => <option key={s.key} value={s.key}>{trTerm(s.label)}</option>)}
          </select>
        </div>
        <div className="pv-fld">
          <label htmlFor="nt-p">{tt('td.priority')}</label>
          <select id="nt-p" value={f.priority} onChange={(e) => set('priority', Number(e.target.value))}>
            {PRIORITIES.map((n) => <option key={n} value={n}>P{n}</option>)}
          </select>
        </div>
        <div className="pv-fld">
          <label htmlFor="nt-type">{tt('qt.type')}</label>
          <select id="nt-type" value={f.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">{tt('vw.none')}</option>
            {types.map((x) => <option key={x} value={x}>{trTerm(x)}</option>)}
          </select>
        </div>
        <div className="pv-fld">
          <label htmlFor="nt-due">{tt('td.due')}</label>
          <input id="nt-due" type="date" value={f.due} onChange={(e) => set('due', e.target.value)} />
        </div>
        <div className="pv-fld">
          <label htmlFor="nt-est">{tt('pd.estH')}</label>
          <input id="nt-est" type="number" min="0" step="0.5" inputMode="decimal" placeholder="3" value={f.est} onChange={(e) => set('est', e.target.value)} />
        </div>
      </div>
      <label className="pv-checkline"><input type="checkbox" checked={f.transferable} onChange={(e) => set('transferable', e.target.checked)} /> {tt('meet.transferable')}</label>
    </PvDialog>
  )
}
