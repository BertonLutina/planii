import { useCallback, useEffect, useRef, useState } from 'react'
import { api, apiUploadProgress, mediaUrl } from '@/lib/api'
import { toast, toastErr } from '@/lib/ui'
import { t as tt } from '@/lib/i18n'
import type { Task, TaskAttachment, TaskAttachmentList } from '@/lib/types'
import { Ic } from './Icon'

const fmtSize = (n: number) =>
  n < 1024 ? `${n} o` : n < 1048576 ? `${Math.round(n / 1024)} Ko` : `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} Mo`

const iconOf = (a: TaskAttachment) =>
  a.kind === 'image' ? 'file-image'
    : a.ext === 'xls' || a.ext === 'xlsx' || a.ext === 'ods' || a.ext === 'csv' ? 'file-sheet'
      : a.ext === 'zip' ? 'file-zip'
        : a.kind === 'pdf' || ['doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'ppt', 'pptx', 'odp'].includes(a.ext) ? 'file-text'
          : 'file'

interface Pending { key: string; name: string; pct: number }

/** Fichiers joints d'une tâche : PDF, Word, Excel, images… (envoi par clic ou glisser-déposer). */
export function TaskFiles({ task, projectClosed }: { task: Task; projectClosed: boolean }) {
  const [data, setData] = useState<TaskAttachmentList | null>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    api<TaskAttachmentList>('GET', '/tasks/' + task.id + '/attachments')
      .then(setData)
      .catch((e: any) => toastErr(e.message))
  }, [task.id])
  useEffect(load, [load])

  async function send(files: File[]) {
    if (!data || !files.length) return
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!data.accept.includes(ext)) { toastErr(tt('files.badType', { n: file.name })); continue }
      if (file.size > data.maxFileBytes) { toastErr(tt('files.tooBig', { n: file.name, max: fmtSize(data.maxFileBytes) })); continue }
      const key = Math.random().toString(36).slice(2)
      setPending((l) => [...l, { key, name: file.name, pct: 0 }])
      try {
        const r = await apiUploadProgress<{ attachment: TaskAttachment }>(
          '/tasks/' + task.id + '/attachments', file,
          (pct) => setPending((l) => l.map((x) => (x.key === key ? { ...x, pct } : x))),
        )
        setData((d) => d && { ...d, attachments: [...d.attachments, r.attachment], usedBytes: d.usedBytes + file.size })
      } catch (e: any) { toastErr(`${file.name} : ${e.message}`) }
      finally { setPending((l) => l.filter((x) => x.key !== key)) }
    }
  }

  /** Les fichiers sont privés : on demande un lien signé de 5 min, puis on l'ouvre / le télécharge. */
  async function open(a: TaskAttachment, download: boolean) {
    // La fenêtre doit s'ouvrir pendant le clic, sinon le navigateur bloque la fenêtre.
    const win = download ? null : window.open('about:blank', '_blank')
    try {
      const r = await api<{ url: string }>('GET', `/attachments/${a.id}/link${download ? '?download=1' : ''}`)
      const url = mediaUrl(r.url)!
      if (download) {
        const link = document.createElement('a')
        link.href = url
        link.download = a.name
        document.body.appendChild(link)
        link.click()
        link.remove()
      } else if (win) win.location.href = url
    } catch (e: any) { win?.close(); toastErr(e.message) }
  }

  async function remove(a: TaskAttachment) {
    if (!window.confirm(tt('files.confirmDel', { n: a.name }))) return
    try {
      await api('DELETE', '/attachments/' + a.id)
      setData((d) => d && { ...d, attachments: d.attachments.filter((x) => x.id !== a.id), usedBytes: Math.max(0, d.usedBytes - a.size) })
      toast(tt('files.deleted'))
    } catch (e: any) { toastErr(e.message) }
  }

  const count = data?.attachments.length ?? 0
  const full = !!data && data.usedBytes >= data.quotaBytes

  return (
    <div className="task-files">
      <div className="task-side-head"><b>{tt('files.title')}</b><span>{count}</span></div>
      {!data && <div className="sub">{tt('common.loading')}</div>}
      {data && count === 0 && pending.length === 0 && <div className="sub">{tt('files.none')}</div>}

      <ul className="file-list">
        {(data?.attachments || []).map((a) => (
          <li key={a.id} className="file-row">
            <span className="file-ic" aria-hidden="true"><Ic name={iconOf(a)} s={18} /></span>
            <span className="file-meta">
              <button type="button" className="file-name" onClick={() => open(a, !a.previewable)} title={a.name}>{a.name}</button>
              <span className="file-sub">{fmtSize(a.size)} · {a.uploaderName || '—'} · {new Date(a.at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
            </span>
            {a.previewable
              ? <button type="button" className="file-act" onClick={() => open(a, false)} aria-label={tt('files.open') + ' — ' + a.name} title={tt('files.open')}><Ic name="external" s={16} /></button>
              : <span className="file-act" aria-hidden="true" />}
            <button type="button" className="file-act" onClick={() => open(a, true)} aria-label={tt('files.download') + ' — ' + a.name} title={tt('files.download')}><Ic name="download" s={16} /></button>
            {a.canDelete && !projectClosed
              ? <button type="button" className="file-act danger" onClick={() => remove(a)} aria-label={tt('action.delete') + ' — ' + a.name} title={tt('action.delete')}><Ic name="trash" s={16} /></button>
              : <span className="file-act" aria-hidden="true" />}
          </li>
        ))}
        {pending.map((p) => (
          <li key={p.key} className="file-row uploading" aria-live="polite">
            <span className="file-ic" aria-hidden="true"><Ic name="upload" s={18} /></span>
            <span className="file-meta">
              <span className="file-name">{p.name}</span>
              <span className="file-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.pct}><i style={{ width: p.pct + '%' }} /></span>
            </span>
            <span className="file-pct">{p.pct}%</span>
          </li>
        ))}
      </ul>

      {data && !projectClosed && (
        <div
          className={'file-drop' + (over ? ' over' : '') + (full ? ' disabled' : '')}
          onDragOver={(e) => { e.preventDefault(); if (!full) setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (!full) send(Array.from(e.dataTransfer.files)) }}
        >
          <input
            ref={input}
            type="file"
            multiple
            hidden
            accept={data.accept.map((x) => '.' + x).join(',')}
            onChange={(e) => { send(Array.from(e.target.files || [])); e.target.value = '' }}
          />
          <button type="button" className="btn ghost sm" disabled={full} onClick={() => input.current?.click()}>
            <Ic name="paperclip" s={15} /> {tt('files.add')}
          </button>
          <span className="file-hint">{full ? tt('files.full') : tt('files.hint', { max: fmtSize(data.maxFileBytes) })}</span>
        </div>
      )}
    </div>
  )
}
