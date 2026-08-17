import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast, toastErr } from '@/components/ui'
import { api } from '@/lib/api'
import { isoLocal } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { pointsFor, taskPoints } from '@/lib/points'
import { prio } from '@/lib/priority'
import { useRealtime } from '@/lib/realtime'
import type { Project, Task, TaskStatus, TodayPayload } from '@/lib/types'
import { useMyTasks } from '@/lib/useProjects'
import { errMsg } from '@/screens/project/lib/flow'
import { statusOf } from '@/screens/project/lib/statuses'
import { useTheme } from '@/theme/ThemeProvider'
import type { Colors } from '@/theme/tokens'

/* Données de l'accueil — portage de `Home` (planii-vite/src/components/Home.tsx).
   Deux sources, comme le web : `GET /tasks/mine` (mes tâches groupées par
   projet) et `GET /today` (le tableau du jour). Les deux se rechargent sur les
   mêmes événements temps réel et sur le même geste de tirer-pour-rafraîchir. */

export interface MyTask { t: Task; p: Project }
export interface StatusGroup { status: TaskStatus; items: MyTask[] }
export interface BoardCol { p: Project; tasks: Task[] }

/** Statuts toujours affichés, même vides — mêmes clés que le web. */
const ALWAYS = ['todo', 'in_progress', 'review', 'transferred', 'done']

/* Le web code cinq statuts de repli avec des hex ; ici le repli passe par les
   jetons du thème pour rester lisible en clair comme en sombre. Les couleurs
   venues du serveur restent, elles, des données de contenu. */
const fallbackStatuses = (c: Colors): TaskStatus[] => ([
  { id: 'todo', key: 'todo', label: t('term.todo'), color: c.muted, position: 0, fixed: true },
  { id: 'in_progress', key: 'in_progress', label: t('term.doing'), color: c.blue, position: 1, fixed: true },
  { id: 'review', key: 'review', label: t('term.reviewSt'), color: c.accent, position: 2, fixed: true },
  { id: 'transferred', key: 'transferred', label: t('term.transferredSt'), color: c.warn, position: 3, fixed: false },
  { id: 'done', key: 'done', label: t('term.doneSt'), color: c.ok, position: 99, fixed: true },
])

const byDue = (a?: string | null, b?: string | null) => (a || '9999').localeCompare(b || '9999')

export function useHome(meId?: string | null) {
  const { c } = useTheme()
  const { projects, error, reload } = useMyTasks()

  const [today, setToday] = useState<TodayPayload | null>(null)
  const [todayError, setTodayError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadToday = useCallback(async () => {
    try {
      const r = await api<{ today: TodayPayload }>('GET', '/today')
      setToday(r.today)
      setTodayError(null)
    } catch (e) {
      /* Le web crie l'erreur en toast ; ici la tuile porte son propre bandeau,
         ce qui évite un toast au tout premier affichage de l'écran. */
      setTodayError(errMsg(e))
    }
  }, [])

  useEffect(() => { loadToday() }, [loadToday])

  const reloadAll = useCallback(async () => {
    await Promise.all([reload(), loadToday()])
  }, [reload, loadToday])

  useRealtime((m) => { if (m.type === 'project' || m.type === 'notif') reloadAll() })

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await reloadAll()
    setRefreshing(false)
  }, [reloadAll])

  /** Mes tâches, tous projets confondus. */
  const mine = useMemo<MyTask[]>(() => {
    if (!projects || !meId) return []
    const out: MyTask[] = []
    for (const p of projects) for (const x of p.tasks) if (x.assigneeId === meId) out.push({ t: x, p })
    return out
  }, [projects, meId])

  const myPoints = useMemo(() => mine.reduce((s, x) => s + taskPoints(x.t), 0), [mine])

  /** Reste à faire, priorité puis échéance — même tri que le web. */
  const todo = useMemo(
    () => mine.filter((x) => !x.t.done)
      .sort((a, b) => prio(a.t.priority) - prio(b.t.priority) || byDue(a.t.due, b.t.due)),
    [mine],
  )

  /** Statuts fusionnés de tous mes projets (le serveur peut en ajouter). */
  const statuses = useMemo<TaskStatus[]>(() => {
    const map = new Map<string, TaskStatus>()
    for (const s of fallbackStatuses(c)) map.set(s.key, s)
    for (const p of projects || []) for (const s of p.statuses || []) map.set(s.key, s)
    return [...map.values()].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
  }, [projects, c])

  /** Vue « liste » : mes tâches groupées par statut. */
  const groups = useMemo<StatusGroup[]>(
    () => statuses
      .map((status) => ({
        status,
        items: mine
          .filter((x) => statusOf(x.t) === status.key)
          .sort((a, b) => (a.t.done ? 1 : 0) - (b.t.done ? 1 : 0)
            || prio(a.t.priority) - prio(b.t.priority)
            || byDue(a.t.due, b.t.due)),
      }))
      .filter((g) => g.items.length > 0 || ALWAYS.includes(g.status.key)),
    [statuses, mine],
  )

  /** Vue « tableau » : une colonne par projet (comme le web), pas par statut. */
  const boardCols = useMemo<BoardCol[]>(
    () => (projects || [])
      .map((p) => ({
        p,
        tasks: mine.filter((x) => x.p.id === p.id).map((x) => x.t)
          .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || prio(a.priority) - prio(b.priority)),
      }))
      .filter((col) => col.tasks.length > 0),
    [projects, mine],
  )

  /** Coche / décoche une tâche. Le barème est annoncé au retour du serveur. */
  const toggle = useCallback(async (x: Task) => {
    try {
      await api('PATCH', '/tasks/' + x.id, { done: !x.done })
      if (!x.done) {
        const gained = pointsFor(x.due, isoLocal(new Date()))
        const when = !x.due ? '' : gained >= 20 ? t('home.early') : gained <= 5 ? t('home.late') : t('home.onTime')
        toast(`Bravo ! +${gained} pts 🎉${when}`)
      }
      reload()
    } catch (e) { toastErr(errMsg(e)) }
  }, [reload])

  /** Change le statut d'une tâche — remplace le glisser-déposer entre colonnes
   *  du web. Le cas « transféré » garde la même règle : la tâche doit être
   *  transférable, et la cible par défaut est l'autre membre du projet. */
  const moveTask = useCallback(async (x: Task, p: Project, statusKey: string) => {
    if (statusKey === statusOf(x)) return
    const body: Record<string, unknown> = { statusKey }
    if (statusKey === 'transferred') {
      if (!x.transferable) { toastErr(t('pd.notTransferable')); return }
      const other = p.members.find((m) => m.id !== (x.assigneeId || meId))
      body.transferredTo = x.transferredTo || other?.id || null
    }
    try {
      await api('PATCH', '/tasks/' + x.id, body)
      toast(statusKey === 'transferred' ? t('pd.taskTransferred') : t('pd.statusOk'))
      reload()
    } catch (e) { toastErr(errMsg(e)) }
  }, [reload, meId])

  return {
    projects, error, today, todayError, refreshing,
    mine, myPoints, todo, statuses, groups, boardCols,
    reload: reloadAll, refresh, toggle, moveTask,
  }
}
