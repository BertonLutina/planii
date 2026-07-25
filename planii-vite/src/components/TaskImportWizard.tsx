import { useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Modal, toast, toastErr } from '@/lib/ui'
import { t as tt } from '@/lib/i18n'
import {
  draftFromModeA,
  draftsFromModeB,
  draftsFromModeC,
  maxCols,
  type ColumnMapping,
  type ImportTaskDraft,
} from '@/lib/taskImportModes'
import {
  colLabel,
  fetchPublicGoogleSheet,
  parseCsvText,
  parseFile,
  type ImportSheet,
} from '@/lib/taskImportParse'

type Step = 'source' | 'sheet' | 'mode' | 'select'
type Mode = 'A' | 'B' | 'C'

const ACCEPTED = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export function TaskImportWizard({
  projectId,
  onClose,
  onImported,
}: {
  projectId: string
  onClose: () => void
  onImported: (count: number) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('source')
  const [sheets, setSheets] = useState<ImportSheet[]>([])
  const [sheetIdx, setSheetIdx] = useState(0)
  const [mode, setMode] = useState<Mode | null>(null)
  const [googleUrl, setGoogleUrl] = useState('')
  const [paste, setPaste] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [mapping, setMapping] = useState<ColumnMapping>({ titleCol: 0, dueCol: null, priorityCol: null })

  const rows = sheets[sheetIdx]?.rows || []
  const cols = maxCols(rows)

  const drafts: ImportTaskDraft[] = useMemo(() => {
    if (!mode) return []
    if (mode === 'A') {
      return [...selectedCells]
        .map((k) => {
          const [r, c] = k.split(':').map(Number)
          return draftFromModeA(rows, r, c)
        })
        .filter((d): d is ImportTaskDraft => !!d)
    }
    if (mode === 'B') {
      return draftsFromModeB(rows, mapping, [...selectedRows].sort((a, b) => a - b))
    }
    return draftsFromModeC(
      rows,
      [...selectedCells].map((k) => {
        const [r, c] = k.split(':').map(Number)
        return { r, c }
      }),
    )
  }, [mode, rows, selectedCells, selectedRows, mapping])

  async function applySheets(next: ImportSheet[]) {
    if (!next.length) {
      setLoadErr(tt('imp.empty'))
      return
    }
    setLoadErr(null)
    setSheets(next)
    setSheetIdx(0)
    setSelectedCells(new Set())
    setSelectedRows(new Set())
    setMapping({ titleCol: 0, dueCol: next[0].rows[0]?.length > 1 ? 1 : null, priorityCol: next[0].rows[0]?.length > 2 ? 2 : null })
    setStep(next.length > 1 ? 'sheet' : 'mode')
  }

  async function onFiles(files: FileList | File[] | null) {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setLoadErr(null)
    try {
      await applySheets(await parseFile(file))
    } catch (e: any) {
      setLoadErr(e?.message || tt('imp.badFile'))
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle() {
    setBusy(true)
    setLoadErr(null)
    try {
      await applySheets(await fetchPublicGoogleSheet(googleUrl))
    } catch (e: any) {
      setLoadErr(e?.message || tt('imp.googleFail'))
    } finally {
      setBusy(false)
    }
  }

  function onPasteLoad() {
    setBusy(true)
    setLoadErr(null)
    try {
      applySheets(parseCsvText(paste))
    } catch (e: any) {
      setLoadErr(e?.message || tt('imp.badFile'))
    } finally {
      setBusy(false)
    }
  }

  function toggleCell(r: number, c: number) {
    const key = `${r}:${c}`
    setSelectedCells((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleRow(r: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }

  function selectAllRows() {
    setSelectedRows(new Set(rows.map((_, i) => i).filter((i) => (rows[i] || []).some((c) => c.trim()))))
  }

  async function doImport() {
    if (!drafts.length || busy) return
    if (drafts.length > 500) {
      toastErr(tt('imp.max500'))
      return
    }
    setBusy(true)
    try {
      const payload = {
        tasks: drafts.map((d) => ({
          title: d.title,
          due: d.due,
          priority: d.priority ?? undefined,
        })),
      }
      const res = await api<{ tasks: unknown[] }>('POST', `/projects/${projectId}/tasks/bulk`, payload)
      const n = res.tasks?.length || drafts.length
      toast(tt('imp.ok', { n }))
      onImported(n)
    } catch (e: any) {
      toastErr(e?.message || tt('imp.fail'))
    } finally {
      setBusy(false)
    }
  }

  const stepLabel =
    step === 'source' ? tt('imp.stepSource')
      : step === 'sheet' ? tt('imp.stepSheet')
        : step === 'mode' ? tt('imp.stepMode')
          : tt('imp.stepSelect')

  return (
    <Modal title={tt('imp.title')} onClose={() => { if (!busy) onClose() }}>
      <div className="imp-wizard">
        <div className="imp-steps">
          <span className={step === 'source' ? 'on' : ''}>{tt('imp.stepSource')}</span>
          <span className={step === 'sheet' ? 'on' : ''}>{tt('imp.stepSheet')}</span>
          <span className={step === 'mode' ? 'on' : ''}>{tt('imp.stepMode')}</span>
          <span className={step === 'select' ? 'on' : ''}>{tt('imp.stepSelect')}</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>{stepLabel}</p>

        {step === 'source' && (
          <div className="imp-source">
            <div
              className={'imp-drop' + (dragOver ? ' over' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files) }}
              onClick={() => fileRef.current?.click()}
            >
              <strong>{tt('imp.drop')}</strong>
              <span>{tt('imp.formats')}</span>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED}
                hidden
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>

            <div className="field">
              <label>{tt('imp.paste')}</label>
              <textarea
                rows={4}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={tt('imp.pastePh')}
                disabled={busy}
              />
              <button className="btn sm" disabled={busy || !paste.trim()} onClick={onPasteLoad}>{tt('imp.loadPaste')}</button>
            </div>

            <div className="field">
              <label>{tt('imp.google')}</label>
              <input
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                disabled={busy}
              />
              <button className="btn sm" disabled={busy || !googleUrl.trim()} onClick={onGoogle}>{tt('imp.loadGoogle')}</button>
            </div>

            {loadErr && <div className="banner" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>{loadErr}</div>}
            {busy && <div className="imp-spinner">{tt('common.loading')}</div>}
          </div>
        )}

        {step === 'sheet' && (
          <div>
            <p>{tt('imp.pickSheet')}</p>
            <div className="imp-sheet-list">
              {sheets.map((s, i) => (
                <button
                  key={s.name + i}
                  className={'btn' + (sheetIdx === i ? ' primary' : '')}
                  onClick={() => setSheetIdx(i)}
                >
                  {s.name} ({s.rows.length})
                </button>
              ))}
            </div>
            <div className="sheet-actions">
              <button className="btn ghost sm" onClick={() => setStep('source')}>{tt('vw.prev')}</button>
              <button className="btn primary sm" onClick={() => setStep('mode')}>{tt('vw.next')}</button>
            </div>
          </div>
        )}

        {step === 'mode' && (
          <div className="imp-modes">
            {(['A', 'B', 'C'] as Mode[]).map((m) => (
              <button
                key={m}
                className={'imp-mode' + (mode === m ? ' on' : '')}
                onClick={() => {
                  setMode(m)
                  setSelectedCells(new Set())
                  setSelectedRows(new Set())
                }}
              >
                <strong>{tt(`imp.mode${m}`)}</strong>
                <span>{tt(`imp.mode${m}X`)}</span>
              </button>
            ))}
            <div className="sheet-actions">
              <button className="btn ghost sm" onClick={() => setStep(sheets.length > 1 ? 'sheet' : 'source')}>{tt('vw.prev')}</button>
              <button className="btn primary sm" disabled={!mode} onClick={() => setStep('select')}>{tt('vw.next')}</button>
            </div>
          </div>
        )}

        {step === 'select' && mode && (
          <div className="imp-select">
            {mode === 'B' && (
              <div className="imp-map">
                <label>
                  {tt('imp.colTitle')}
                  <select value={mapping.titleCol} onChange={(e) => setMapping({ ...mapping, titleCol: +e.target.value })}>
                    {Array.from({ length: cols }, (_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                  </select>
                </label>
                <label>
                  {tt('imp.colDue')}
                  <select
                    value={mapping.dueCol ?? ''}
                    onChange={(e) => setMapping({ ...mapping, dueCol: e.target.value === '' ? null : +e.target.value })}
                  >
                    <option value="">—</option>
                    {Array.from({ length: cols }, (_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                  </select>
                </label>
                <label>
                  {tt('imp.colPrio')}
                  <select
                    value={mapping.priorityCol ?? ''}
                    onChange={(e) => setMapping({ ...mapping, priorityCol: e.target.value === '' ? null : +e.target.value })}
                  >
                    <option value="">—</option>
                    {Array.from({ length: cols }, (_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                  </select>
                </label>
                <button className="btn sm" type="button" onClick={selectAllRows}>{tt('imp.selectAllRows')}</button>
              </div>
            )}

            <div className="imp-select-body">
              <div className="imp-grid-wrap">
                <table className="imp-grid">
                  <thead>
                    <tr>
                      {mode === 'B' && <th />}
                      {Array.from({ length: cols }, (_, c) => <th key={c}>{colLabel(c)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, r) => (
                      <tr key={r} className={mode === 'B' && selectedRows.has(r) ? 'sel-row' : ''}>
                        {mode === 'B' && (
                          <td className="imp-row-pick">
                            <input type="checkbox" checked={selectedRows.has(r)} onChange={() => toggleRow(r)} />
                          </td>
                        )}
                        {Array.from({ length: cols }, (_, c) => {
                          const val = row[c] || ''
                          const on = selectedCells.has(`${r}:${c}`)
                          return (
                            <td
                              key={c}
                              className={mode !== 'B' && on ? 'sel' : ''}
                              onClick={() => { if (mode !== 'B') toggleCell(r, c) }}
                              title={val}
                            >
                              {val}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <aside className="imp-preview">
                <div className="section-h">{tt('imp.preview')} ({drafts.length})</div>
                {drafts.length === 0 && <div className="muted">{tt('imp.previewEmpty')}</div>}
                <ul>
                  {drafts.slice(0, 80).map((d) => (
                    <li key={d.key}>
                      <strong>{d.title}</strong>
                      {(d.due || d.priority != null) && (
                        <span className="muted">
                          {d.due ? ` · ${d.due}` : ''}
                          {d.priority != null ? ` · P${d.priority}` : ''}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {drafts.length > 80 && <div className="muted">+{drafts.length - 80}</div>}
              </aside>
            </div>

            <div className="sheet-actions">
              <button className="btn ghost sm" disabled={busy} onClick={() => setStep('mode')}>{tt('vw.prev')}</button>
              <button className="btn primary" disabled={busy || drafts.length === 0} onClick={doImport}>
                {busy ? tt('imp.importing') : tt('imp.import', { n: drafts.length })}
              </button>
            </div>
            {busy && <div className="imp-spinner">{tt('imp.importing')}</div>}
          </div>
        )}
      </div>
    </Modal>
  )
}
