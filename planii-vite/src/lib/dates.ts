import type { Task } from './types'

export const MONTHS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
export const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
export const DOW = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

export const todayMid = (): Date => { const d = new Date(); d.setHours(0,0,0,0); return d }
export const isoLocal = (d: Date) => {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), j = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${j}`
}
export const parseISO = (s?: string | null): Date | null => {
  if (!s) return null
  const d = new Date(String(s).slice(0,10) + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}
export const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r }
export const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth()+n); return r }
export const isSameDay = (a?: Date | null, b?: Date | null) =>
  !!a && !!b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
export const isSameMonth = (a?: Date | null, b?: Date | null) =>
  !!a && !!b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth()
export function startOfWeekMon(d: Date): Date {
  const r = new Date(d), day = r.getDay()
  r.setDate(r.getDate() + (day===0 ? -6 : 1-day)); r.setHours(0,0,0,0); return r
}
export function monthGrid(ref: Date): Date[] {
  const y = ref.getFullYear(), mo = ref.getMonth(), first = new Date(y,mo,1), last = new Date(y,mo+1,0)
  const pad = (first.getDay()+6)%7, cells: Date[] = []
  for (let i=0;i<pad;i++) cells.push(addDays(first, -pad+i))
  for (let d=1; d<=last.getDate(); d++) cells.push(new Date(y,mo,d))
  while (cells.length%7!==0) cells.push(addDays(cells[cells.length-1], 1))
  return cells
}
export function formatDue(s?: string | null): string {
  const d = parseISO(s); if (!d) return ''
  const k = Math.round((d.getTime()-todayMid().getTime())/864e5)
  if (k===0) return "aujourd'hui"; if (k===1) return 'demain'; if (k===-1) return 'hier'
  if (k<-1) return `en retard de ${-k} j`; if (k>1 && k<=6) return `dans ${k} j`
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const isOverdue = (t: Task) => { const d = parseISO(t.due); return !!d && !t.done && d < todayMid() }
export const initials = (n?: string) => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()
export const trunc = (s: string, n: number) => (s && s.length>n) ? s.slice(0,n)+'…' : s

export const TYPE_LABEL: Record<string,string> = { solo:'1-à-1 · client', team:'Équipe · leader + prestataires', group:'Groupe' }
export const ROLE_LABEL: Record<string,string> = { owner:'Propriétaire', lead:'Leader', provider:'Prestataire', client:'Client', member:'Membre' }
export const INVITE_ROLES: Record<string,[string,string][]> = {
  solo: [['client','Client']],
  team: [['client','Client'],['provider','Collègue prestataire']],
  group: [['member','Membre']],
}
export const canManage = (role: string) => role==='owner' || role==='lead'
