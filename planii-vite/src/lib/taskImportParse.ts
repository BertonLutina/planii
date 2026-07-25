import * as XLSX from 'xlsx'
import { api } from './api'
import { cellText } from './taskImportNormalize'

export type ImportSheet = { name: string; rows: string[][] }

function matrixFromSheet(sheet: XLSX.WorkSheet): string[][] {
  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })
  return raw.map((row) => (Array.isArray(row) ? row.map((c) => cellText(c)) : []))
}

export function parseWorkbook(buffer: ArrayBuffer): ImportSheet[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  return wb.SheetNames.map((name) => ({
    name,
    rows: matrixFromSheet(wb.Sheets[name]),
  })).filter((s) => s.rows.some((r) => r.some((c) => c.trim())))
}

export function parseCsvText(text: string): ImportSheet[] {
  const wb = XLSX.read(text, { type: 'string', raw: false })
  return wb.SheetNames.map((name) => ({
    name,
    rows: matrixFromSheet(wb.Sheets[name]),
  })).filter((s) => s.rows.some((r) => r.some((c) => c.trim())))
}

export async function parseFile(file: File): Promise<ImportSheet[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return parseCsvText(await file.text())
  }
  const buf = await file.arrayBuffer()
  return parseWorkbook(buf)
}

export function extractGoogleSheetIds(url: string): { id: string; gid: string } | null {
  const s = url.trim()
  const idMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) return null
  const gidMatch = s.match(/[?#&]gid=(\d+)/)
  return { id: idMatch[1], gid: gidMatch ? gidMatch[1] : '0' }
}

export async function fetchPublicGoogleSheet(url: string): Promise<ImportSheet[]> {
  const ids = extractGoogleSheetIds(url)
  if (!ids) throw new Error('URL Google Sheets invalide')
  // Proxy via backend to avoid browser CORS on Google export URLs
  const { csv } = await api<{ csv: string }>('POST', '/import/google-sheet', { url: url.trim() })
  const sheets = parseCsvText(csv)
  if (!sheets.length) throw new Error('Feuille vide')
  return [{ name: `Sheet ${ids.gid}`, rows: sheets[0].rows }]
}

export function colLabel(index: number): string {
  let n = index
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}
