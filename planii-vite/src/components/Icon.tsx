import {
  Home, Folder, Calendar, CalendarDays, Trophy, User, UserPlus, Users, Shield, Search, Bell,
  Plus, Check, X, Trash2, Pencil, Mic, Video, Star, Clock, Flag, Lock, ChevronDown, ChevronRight,
  ArrowLeft, MoreHorizontal, List, LayoutGrid, Sun, Moon, Monitor, Copy, RefreshCw, Send,
  TriangleAlert, Flame, TrendingUp, Settings, Mail, LogOut, Filter, ArrowUpDown, GripVertical,
  Megaphone, Sparkles, Target, Inbox, MessageSquare, Hand, PieChart, ChartBar, Circle, CircleCheck,
  Clock4, ArrowUpRight, Repeat, ListChecks, Vote, Activity, type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  home: Home, folder: Folder, calendar: Calendar, 'calendar-days': CalendarDays, trophy: Trophy,
  user: User, 'user-plus': UserPlus, users: Users, shield: Shield, search: Search, bell: Bell,
  plus: Plus, check: Check, x: X, trash: Trash2, edit: Pencil, mic: Mic, video: Video, star: Star,
  clock: Clock, 'clock-late': Clock4, flag: Flag, lock: Lock, 'chevron-down': ChevronDown,
  'chevron-right': ChevronRight, back: ArrowLeft, more: MoreHorizontal, list: List, board: LayoutGrid,
  sun: Sun, moon: Moon, monitor: Monitor, copy: Copy, refresh: RefreshCw, send: Send,
  alert: TriangleAlert, flame: Flame, trending: TrendingUp, settings: Settings, mail: Mail,
  logout: LogOut, filter: Filter, sort: ArrowUpDown, grip: GripVertical, megaphone: Megaphone,
  sparkles: Sparkles, target: Target, inbox: Inbox, message: MessageSquare, hand: Hand,
  'chart-pie': PieChart, 'chart-bar': ChartBar, circle: Circle, 'circle-check': CircleCheck,
  'arrow-up-right': ArrowUpRight, transfer: Repeat, tasks: ListChecks, poll: Vote, activity: Activity,
}

/** Icône en trait (lucide), taille et épaisseur cohérentes.
 *  <Ic name="mic" /> · s = taille en px · c = couleur (héritée par défaut). */
export function Ic({ name, s = 18, c, className, strokeWidth = 1.9 }:
  { name: string; s?: number; c?: string; className?: string; strokeWidth?: number }) {
  const C = MAP[name] || Circle
  return <C size={s} strokeWidth={strokeWidth} color={c} className={className} aria-hidden focusable={false} style={{ flex: 'none', display: 'inline-block', verticalAlign: 'middle' }} />
}
