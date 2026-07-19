import type { Task } from './types'
import { getLang, type Lang } from './i18n'

/* Données de locale (mois, jours, rôles…) par langue. Les exports gardent la même
 * forme (tableaux / objets indexables) grâce à des Proxy : aucun appelant à changer. */
const M_SHORT: Record<Lang, string[]> = {
  fr: ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  nl: ['jan.','feb.','mrt.','apr.','mei','jun.','jul.','aug.','sep.','okt.','nov.','dec.'],
  es: ['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sep.','oct.','nov.','dic.'],
  pt: ['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'],
  it: ['gen.','feb.','mar.','apr.','mag.','giu.','lug.','ago.','set.','ott.','nov.','dic.'],
  el: ['Ιαν','Φεβ','Μάρ','Απρ','Μάι','Ιούν','Ιούλ','Αύγ','Σεπ','Οκτ','Νοέ','Δεκ'],
  ru: ['янв.','февр.','март','апр.','май','июнь','июль','авг.','сент.','окт.','нояб.','дек.'],
  sw: ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ago','Sep','Okt','Nov','Des'],
}
const M_FULL: Record<Lang, string[]> = {
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  nl: ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  it: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
  el: ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'],
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  sw: ['Januari','Februari','Machi','Aprili','Mei','Juni','Julai','Agosti','Septemba','Oktoba','Novemba','Desemba'],
}
const D_OW: Record<Lang, string[]> = {
  fr: ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],
  en: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  nl: ['Ma','Di','Wo','Do','Vr','Za','Zo'],
  es: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
  pt: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],
  it: ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'],
  el: ['Δευ','Τρί','Τετ','Πέμ','Παρ','Σάβ','Κυρ'],
  ru: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
  sw: ['Jtatu','Jnne','Jtano','Alh','Ijumaa','Jmosi','Jpili'],
}
const arrProxy = (data: Record<Lang, string[]>): string[] =>
  new Proxy([] as string[], { get: (_t, p) => (data[getLang()] as any)[p] }) as string[]

export const MONTHS = arrProxy(M_SHORT)
export const MONTHS_FULL = arrProxy(M_FULL)
export const DOW = arrProxy(D_OW)

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
const DUE: Record<Lang, { today: string; tomorrow: string; yesterday: string; late: (n: number) => string; in: (n: number) => string }> = {
  fr: { today: "aujourd'hui", tomorrow: 'demain', yesterday: 'hier', late: (n) => `en retard de ${n} j`, in: (n) => `dans ${n} j` },
  en: { today: 'today', tomorrow: 'tomorrow', yesterday: 'yesterday', late: (n) => `${n}d overdue`, in: (n) => `in ${n}d` },
  nl: { today: 'vandaag', tomorrow: 'morgen', yesterday: 'gisteren', late: (n) => `${n} d te laat`, in: (n) => `over ${n} d` },
  es: { today: 'hoy', tomorrow: 'mañana', yesterday: 'ayer', late: (n) => `${n} d de retraso`, in: (n) => `en ${n} d` },
  pt: { today: 'hoje', tomorrow: 'amanhã', yesterday: 'ontem', late: (n) => `${n} d de atraso`, in: (n) => `em ${n} d` },
  it: { today: 'oggi', tomorrow: 'domani', yesterday: 'ieri', late: (n) => `${n} g di ritardo`, in: (n) => `tra ${n} g` },
  el: { today: 'σήμερα', tomorrow: 'αύριο', yesterday: 'χθες', late: (n) => `${n} μ καθυστ.`, in: (n) => `σε ${n} μ` },
  ru: { today: 'сегодня', tomorrow: 'завтра', yesterday: 'вчера', late: (n) => `просрочено ${n} дн`, in: (n) => `через ${n} дн` },
  sw: { today: 'leo', tomorrow: 'kesho', yesterday: 'jana', late: (n) => `imechelewa siku ${n}`, in: (n) => `baada ya siku ${n}` },
}
export function formatDue(s?: string | null): string {
  const d = parseISO(s); if (!d) return ''
  const L = DUE[getLang()]
  const k = Math.round((d.getTime()-todayMid().getTime())/864e5)
  if (k===0) return L.today; if (k===1) return L.tomorrow; if (k===-1) return L.yesterday
  if (k<-1) return L.late(-k); if (k>1 && k<=6) return L.in(k)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const isOverdue = (t: Task) => { const d = parseISO(t.due); return !!d && !t.done && d < todayMid() }
export const initials = (n?: string) => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()
export const trunc = (s: string, n: number) => (s && s.length>n) ? s.slice(0,n)+'…' : s

const TYPES: Record<Lang, Record<string,string>> = {
  fr: { solo:'1-à-1 · client', team:'Équipe · leader + prestataires', group:'Groupe' },
  en: { solo:'1-to-1 · client', team:'Team · leader + providers', group:'Group' },
  nl: { solo:'1-op-1 · klant', team:'Team · leider + dienstverleners', group:'Groep' },
  es: { solo:'1-a-1 · cliente', team:'Equipo · líder + proveedores', group:'Grupo' },
  pt: { solo:'1-a-1 · cliente', team:'Equipa · líder + prestadores', group:'Grupo' },
  it: { solo:'1-a-1 · cliente', team:'Team · leader + fornitori', group:'Gruppo' },
  el: { solo:'1-προς-1 · πελάτης', team:'Ομάδα · αρχηγός + συνεργάτες', group:'Γκρουπ' },
  ru: { solo:'1-на-1 · клиент', team:'Команда · лидер + исполнители', group:'Группа' },
  sw: { solo:'1-kwa-1 · mteja', team:'Timu · kiongozi + watoa huduma', group:'Kikundi' },
}
const ROLES: Record<Lang, Record<string,string>> = {
  fr: { owner:'Propriétaire', lead:'Leader', provider:'Prestataire', client:'Client', member:'Membre' },
  en: { owner:'Owner', lead:'Leader', provider:'Provider', client:'Client', member:'Member' },
  nl: { owner:'Eigenaar', lead:'Leider', provider:'Dienstverlener', client:'Klant', member:'Lid' },
  es: { owner:'Propietario', lead:'Líder', provider:'Proveedor', client:'Cliente', member:'Miembro' },
  pt: { owner:'Proprietário', lead:'Líder', provider:'Prestador', client:'Cliente', member:'Membro' },
  it: { owner:'Proprietario', lead:'Leader', provider:'Fornitore', client:'Cliente', member:'Membro' },
  el: { owner:'Ιδιοκτήτης', lead:'Αρχηγός', provider:'Συνεργάτης', client:'Πελάτης', member:'Μέλος' },
  ru: { owner:'Владелец', lead:'Лидер', provider:'Исполнитель', client:'Клиент', member:'Участник' },
  sw: { owner:'Mmiliki', lead:'Kiongozi', provider:'Mtoa huduma', client:'Mteja', member:'Mwanachama' },
}
const objProxy = (data: Record<Lang, Record<string,string>>): Record<string,string> =>
  new Proxy({}, { get: (_t, p) => data[getLang()][String(p)] }) as Record<string,string>

export const TYPE_LABEL = objProxy(TYPES)
export const ROLE_LABEL = objProxy(ROLES)
export const INVITE_ROLES: Record<string,[string,string][]> = new Proxy({}, {
  get: (_t, p) => {
    const R = ROLES[getLang()]
    const coProvider: Record<Lang, string> = { fr:'Collègue prestataire', en:'Fellow provider', nl:'Collega-dienstverlener', es:'Colega proveedor', pt:'Colega prestador', it:'Collega fornitore', el:'Συνάδελφος συνεργάτης', ru:'Коллега-исполнитель', sw:'Mtoa huduma mwenzako' }
    const map: Record<string,[string,string][]> = {
      solo: [['client', R.client]],
      team: [['client', R.client],['provider', coProvider[getLang()]]],
      group: [['member', R.member]],
    }
    return map[String(p)]
  },
}) as Record<string,[string,string][]>
export const canManage = (role: string) => role==='owner' || role==='lead'
