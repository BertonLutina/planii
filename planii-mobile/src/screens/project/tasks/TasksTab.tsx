import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ActionMenu, Banner, Button, Confirm, EmptyState, GroupHeader,
  type ActionItem,
} from '@/components/ui'
import { VoiceTaskWizard } from '@/components/VoiceTaskWizard'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { speechSupported } from '@/lib/speech'
import { PRIORITIES, prio, prioMeta } from '@/lib/priority'
import { taskComparator, type Dir, type TaskSort } from '@/lib/sort'
import type { Project, Task, TaskStatus, User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { ChipSelect, type ChipOption } from '../controls/ChipSelect'
import { afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'
import { taskPerms } from '../lib/perms'
import { statusOf } from '../lib/statuses'
import type { ProjectData } from '../lib/useProjectData'
import { ImportWizard } from './ImportWizard'
import { NewTaskSheet } from './TaskFormSheet'
import { TaskRow } from './TaskRow'
import { TaskSheet } from './TaskSheet'
import { TransferSheet } from './TransferSheet'

/* Onglet « Tâches » — portage de `TasksTab` (planii-vite/src/components/
   ProjectDetail.tsx).

   Ce que le web fait et que le téléphone ne peut pas reprendre tel quel :

   — Le tableau kanban (une section par personne × une colonne par statut) ne
     tient pas dans 320 pt : cinq colonnes de 64 pt. Il devient ici une liste
     unique groupée par responsable (le même découpage que les sections du web)
     avec un filtre de statut en puces. Le statut de chaque tâche reste visible
     sur sa ligne, et se change depuis le menu « … » ou la feuille de détail —
     ce que le glisser-déposer faisait sur le bureau.

   — Le glisser-déposer d'ordre (`PUT /projects/:id/tasks/order`) devient
     « Précédent / Suivant » dans le menu de la tâche, comme la liste des
     projets. Pas de rail de chevrons ici : une ligne de tâche porte déjà une
     case à cocher, un chevron de repli et un bouton « … » ; 40 pt de rail en
     plus écraseraient le titre sur trois lignes à 320 pt.

   — Les sous-tâches sont des lignes indentées sous leur parent, repliables par
     le chevron du parent : la hiérarchie reste lisible sans fil d'Ariane. */

export interface TasksTabProps {
  p: Project
  me: User
  statuses: TaskStatus[]
  data: ProjectData
  /** Ouverture demandée par le bouton flottant de l'écran. */
  newOpen: boolean
  onCloseNew: () => void
}

type Row =
  | { kind: 'group'; key: string; title: string; count: number }
  | {
    kind: 'task'; key: string; task: Task; sub: boolean
    subCount: number; subDone: number; collapsed: boolean
  }

interface Creating { parentId: string | null; parentTitle?: string }

export function TasksTab({ p, me, statuses, data, newOpen, onCloseNew }: TasksTabProps) {
  const insets = useSafeAreaInsets()
  const { c } = useTheme()
  const accent = c.accent
  useI18n()

  const [sort, setSort] = useState<TaskSort>('priority')
  const [dir, setDir] = useState<Dir>('asc')
  const [filterUser, setFilterUser] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const [sortOpen, setSortOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [creating, setCreating] = useState<Creating | null>(null)
  const [menuFor, setMenuFor] = useState<Task | null>(null)
  const [prioFor, setPrioFor] = useState<Task | null>(null)
  const [statusFor, setStatusFor] = useState<Task | null>(null)
  const [transferFor, setTransferFor] = useState<Task | null>(null)
  const [detailFor, setDetailFor] = useState<Task | null>(null)
  const [delFor, setDelFor] = useState<Task | null>(null)
  const [busy, setBusy] = useState(false)

  const closed = p.status === 'done'
  const [voiceOk] = useState(speechSupported)

  useEffect(() => { if (newOpen) setCreating({ parentId: null }) }, [newOpen])

  const closeCreate = useCallback(() => { setCreating(null); onCloseNew() }, [onCloseNew])

  /** Écriture + rechargement. Le message part après la sortie d'une feuille :
   *  un toast ne doit jamais s'afficher sous une fenêtre modale. */
  const run = useCallback(async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn()
      if (ok) toastAfterSheet(ok)
      data.reload()
    } catch (e) {
      toastErrAfterSheet(errMsg(e))
    }
  }, [data])

  const cmp = useMemo(() => taskComparator(sort, dir), [sort, dir])

  const roots = useMemo(() => p.tasks.filter((x) => !x.parentId).slice().sort(cmp), [p.tasks, cmp])
  const subsOf = useCallback(
    (id: string) => p.tasks.filter((x) => x.parentId === id).slice().sort(cmp),
    [p.tasks, cmp],
  )

  /* ── Écritures ─────────────────────────────────────────────────────── */

  const toggleDone = useCallback((x: Task) => {
    run(() => api('PATCH', '/tasks/' + x.id, { done: !x.done }), x.done ? undefined : t('pd.taskDone'))
  }, [run])

  const claim = useCallback((x: Task) => {
    run(() => api('POST', '/tasks/' + x.id + '/claim', {}), t('pd.taskClaimed'))
  }, [run])

  const remind = useCallback((x: Task) => {
    run(() => api('POST', '/tasks/' + x.id + '/remind', {}), t('pd.remindOk'))
  }, [run])

  const setPriority = useCallback((x: Task, n: number) => {
    run(() => api('PATCH', '/tasks/' + x.id, { priority: n }), t('ad.prioSet', { n }))
  }, [run])

  const moveStatus = useCallback((x: Task, key: string) => {
    if (key === 'transferred' && !x.transferable) { toastErrAfterSheet(t('pd.notTransferable')); return }
    const other = p.members.find((m) => m.id !== (x.assigneeId || me.id))
    const to = key === 'transferred' ? (x.transferredTo || other?.id || x.assigneeId || null) : null
    run(
      () => api('PATCH', '/tasks/' + x.id, { statusKey: key, transferredTo: to }),
      key === 'transferred' ? t('pd.taskTransferred') : t('pd.statusOk'),
    )
  }, [p.members, me.id, run])

  const transfer = useCallback(async (userId: string) => {
    const x = transferFor
    if (!x) return
    setBusy(true)
    try {
      await api('PATCH', '/tasks/' + x.id, { statusKey: 'transferred', transferredTo: userId })
      setBusy(false)
      setTransferFor(null)
      toastAfterSheet(t('pd.taskTransferred'))
      data.reload()
    } catch (e) {
      setBusy(false)
      setTransferFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }, [transferFor, data])

  const confirmDelete = useCallback(async () => {
    const x = delFor
    if (!x) return
    setBusy(true)
    try {
      await api('DELETE', '/tasks/' + x.id)
      setBusy(false)
      setDelFor(null)
      toastAfterSheet(t('pd.taskDeleted'))
      data.reload()
    } catch (e) {
      setBusy(false)
      setDelFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }, [delFor, data])

  /** Réordonnancement d'un cran — même charge utile que le web. */
  const move = useCallback((id: string, delta: -1 | 1) => {
    const ids = roots.map((x) => x.id)
    const from = ids.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    run(() => api('PUT', '/projects/' + p.id + '/tasks/order', { ids }))
  }, [roots, p.id, run])

  /* ── Filtres et groupes ────────────────────────────────────────────── */

  const visibleRoots = useMemo(() => {
    let list = roots
    if (statusFilter !== 'all') list = list.filter((x) => statusOf(x) === statusFilter)
    if (filterUser === 'none') list = list.filter((x) => !x.assigneeId)
    else if (filterUser !== 'all') {
      list = list.filter((x) => (
        x.assigneeId === filterUser || x.transferredFrom === filterUser || x.transferredTo === filterUser
      ))
    }
    return list
  }, [roots, statusFilter, filterUser])

  const rows = useMemo<Row[]>(() => {
    const push = (out: Row[], x: Task) => {
      const subs = subsOf(x.id)
      const isCollapsed = collapsed[x.id] ?? false
      out.push({
        kind: 'task', key: x.id, task: x, sub: false,
        subCount: subs.length, subDone: subs.filter((y) => y.done).length, collapsed: isCollapsed,
      })
      if (!isCollapsed) {
        for (const sx of subs) {
          out.push({ kind: 'task', key: sx.id, task: sx, sub: true, subCount: 0, subDone: 0, collapsed: false })
        }
      }
    }

    const out: Row[] = []
    /* Un seul groupe : pas d'en-tête, il ne dirait rien de plus. */
    if (filterUser !== 'all') {
      visibleRoots.forEach((x) => push(out, x))
      return out
    }

    const buckets = new Map<string, Task[]>()
    for (const x of visibleRoots) {
      const k = x.assigneeId ?? ''
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k)!.push(x)
    }
    const keys = [...buckets.keys()].sort((a, b) => (
      a === '' ? 1 : b === '' ? -1 : (p.members.find((m) => m.id === a)?.name ?? '')
        .localeCompare(p.members.find((m) => m.id === b)?.name ?? '', 'fr', { sensitivity: 'base' })
    ))
    if (keys.length <= 1) {
      visibleRoots.forEach((x) => push(out, x))
      return out
    }
    for (const k of keys) {
      const list = buckets.get(k)!
      out.push({
        kind: 'group',
        key: 'g:' + (k || 'none'),
        title: k ? (p.members.find((m) => m.id === k)?.name ?? '—') : t('pd.toTakeCap'),
        count: list.length,
      })
      list.forEach((x) => push(out, x))
    }
    return out
  }, [visibleRoots, filterUser, collapsed, subsOf, p.members])

  /* ── Menus ─────────────────────────────────────────────────────────── */

  const sortItems: ActionItem[] = useMemo(() => {
    const pick = (m: TaskSort, d: Dir) => () => { setSort(m); setDir(d) }
    return [
      { label: `${t('td.priority')} · P1 → P6`, icon: 'flag', onPress: pick('priority', 'asc') },
      { label: `${t('td.priority')} · P6 → P1`, icon: 'flag', onPress: pick('priority', 'desc') },
      { label: `${t('td.due')} ↑`, icon: 'calendar', onPress: pick('due', 'asc') },
      { label: `${t('td.due')} ↓`, icon: 'calendar', onPress: pick('due', 'desc') },
      { label: `${t('projects.sortTitle')} A → Z`, icon: 'sort', onPress: pick('title', 'asc') },
      { label: `${t('projects.sortTitle')} Z → A`, icon: 'sort', onPress: pick('title', 'desc') },
      { label: t('projects.sortManual'), icon: 'grip', onPress: pick('manual', 'asc') },
    ]
  }, [])

  const sortLabel = sort === 'manual'
    ? t('projects.sortManual')
    : sort === 'title'
      ? `${t('projects.sortTitle')} ${dir === 'asc' ? 'A → Z' : 'Z → A'}`
      : sort === 'due'
        ? `${t('td.due')} ${dir === 'asc' ? '↑' : '↓'}`
        : `${t('td.priority')} ${dir === 'asc' ? 'P1 → P6' : 'P6 → P1'}`

  const taskItems: ActionItem[] = useMemo(() => {
    const x = menuFor
    if (!x) return []
    const perms = taskPerms(x, p, me, !!x.parentId)
    const subs = x.parentId ? [] : p.tasks.filter((y) => y.parentId === x.id)
    const i = roots.findIndex((y) => y.id === x.id)
    const out: ActionItem[] = []
    /* Comme le web : « Modifier » n'apparaît que si on peut vraiment modifier.
       En lecture seule, la ligne reste appuyable pour ouvrir le détail. */
    if (perms.canEditMeta || perms.canLogHours) {
      out.push({ label: t('pd.mEdit'), icon: 'edit', onPress: () => afterSheet(() => setDetailFor(x)) })
    }
    if (perms.canSub) out.push({ label: t('pd.mSub'), icon: 'plus', onPress: () => afterSheet(() => setCreating({ parentId: x.id, parentTitle: x.title })) })
    if (perms.canPrio) out.push({ label: t('pd.mPrio'), icon: 'flag', onPress: () => afterSheet(() => setPrioFor(x)) })
    if (perms.canMove) out.push({ label: t('meet.status'), icon: 'board', onPress: () => afterSheet(() => setStatusFor(x)) })
    if (perms.canTransfer) out.push({ label: t('pd.mTransfer'), icon: 'transfer', onPress: () => afterSheet(() => setTransferFor(x)) })
    if (perms.canClaim) out.push({ label: t('pd.mClaim'), icon: 'hand', onPress: () => claim(x) })
    if (perms.canRelance) out.push({ label: t('pd.mRemind'), icon: 'mail', onPress: () => remind(x) })
    if (!closed && sort === 'manual' && !x.parentId) {
      out.push({ label: t('guide.prev'), icon: 'chevron-up', disabled: i <= 0, onPress: () => move(x.id, -1) })
      out.push({ label: t('guide.next'), icon: 'chevron-down', disabled: i < 0 || i >= roots.length - 1, onPress: () => move(x.id, 1) })
    }
    if (perms.canDel) {
      out.push({
        label: t('action.delete') + (subs.length > 0 ? t('pd.andSubs') : ''),
        icon: 'trash',
        tone: 'danger',
        onPress: () => afterSheet(() => setDelFor(x)),
      })
    }
    return out
  }, [menuFor, p, me, roots, closed, sort, claim, remind, move])

  const prioItems: ActionItem[] = useMemo(() => {
    const x = prioFor
    if (!x) return []
    const cur = prio(x.priority)
    return PRIORITIES.map((n) => ({
      label: `${prioMeta(n).tag} · ${prioMeta(n).label}${cur === n ? ' ✓' : ''}`,
      icon: 'flag',
      onPress: () => setPriority(x, n),
    }))
  }, [prioFor, setPriority])

  const statusItems: ActionItem[] = useMemo(() => {
    const x = statusFor
    if (!x) return []
    const cur = statusOf(x)
    return statuses.map((st) => ({
      label: `${trTerm(st.label)}${cur === st.key ? ' ✓' : ''}`,
      icon: st.key === 'done' ? 'check' : st.key === 'transferred' ? 'transfer' : 'circle',
      disabled: st.key === cur,
      onPress: () => moveStatus(x, st.key),
    }))
  }, [statusFor, statuses, moveStatus])

  /* ── Rendu ─────────────────────────────────────────────────────────── */

  const overdueCount = useMemo(() => p.tasks.filter((x) => taskPerms(x, p, me).over).length, [p, me])

  const userItems: ChipOption<string>[] = [
    { key: 'all', label: t('pd.everyone'), tone: 'accent' },
    ...p.members.map((m) => ({ key: m.id, label: m.id === me.id ? `${m.name} ${t('vw.me')}` : m.name })),
    { key: 'none', label: t('pd.toTakeCap'), tone: 'warn' },
  ]
  const statusChips: ChipOption<string>[] = [
    { key: 'all', label: t('pd.allStatuses'), tone: 'accent' },
    ...statuses.map((st) => ({ key: st.key, label: trTerm(st.label) })),
  ]

  const header = (
    <View style={s.tools}>
      {overdueCount > 0 && (
        <Banner
          tone="danger"
          icon="clock-late"
          text={`${overdueCount} ${t('pd.taskCount')} — ${t('today.overdue')}`}
          style={s.banner}
        />
      )}
      <View style={s.toolRow}>
        <Button
          label={sortLabel}
          icon="sort"
          size="sm"
          accessibilityLabel={`${t('projects.sort')} — ${sortLabel}`}
          onPress={() => setSortOpen(true)}
        />
        {!closed && (
          <Button label={t('imp.title')} icon="copy" size="sm" onPress={() => setImportOpen(true)} />
        )}
        {/* Sans reconnaissance vocale (Expo Go), l'assistant guidé ne serait
            qu'un formulaire de tâche plus lent : le bouton disparaît. */}
        {!closed && voiceOk && (
          <Button label={t('pd.dictate')} icon="mic" size="sm" onPress={() => setVoiceOpen(true)} />
        )}
      </View>
      <ChipSelect label={t('pd.filter')} options={userItems} value={filterUser} onChange={setFilterUser} scroll style={s.filter} />
      <ChipSelect options={statusChips} value={statusFilter} onChange={setStatusFilter} scroll style={s.filter} />
    </View>
  )

  const footer = data.tasksHasMore
    ? (
      <Button
        label={`${t('common.loadMore')} (${p.tasks.length}/${p.taskCount ?? '?'})`}
        variant="ghost"
        loading={data.tasksLoading}
        onPress={data.loadMoreTasks}
        style={s.more}
      />
    )
    : null

  return (
    <View style={s.fill}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => (
          item.kind === 'group'
            ? <GroupHeader title={item.title} count={item.count} style={s.group} />
            : (
              <TaskRow
                task={item.task}
                p={p}
                me={me}
                statuses={statuses}
                sub={item.sub}
                subCount={item.subCount}
                subDone={item.subDone}
                collapsed={item.collapsed}
                onToggleCollapse={item.subCount > 0
                  ? () => setCollapsed((v) => ({ ...v, [item.task.id]: !v[item.task.id] }))
                  : undefined}
                onOpen={() => setDetailFor(item.task)}
                onCheck={() => toggleDone(item.task)}
                onMenu={() => setMenuFor(item.task)}
                onRemind={() => remind(item.task)}
              />
            )
        )}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <EmptyState
            icon="circle-check"
            title={t('pd.noTasks')}
            message={closed ? t('pd.closedRO') : undefined}
            actionLabel={closed ? undefined : t('qt.title')}
            onAction={closed ? undefined : () => setCreating({ parentId: null })}
          />
        }
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={data.tasksLoading} onRefresh={data.reload} tintColor={accent} colors={[accent]} />
        }
      />

      <ActionMenu open={sortOpen} onClose={() => setSortOpen(false)} title={t('projects.sort')} items={sortItems} />
      <ActionMenu
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title ?? t('pd.actions')}
        items={taskItems}
      />
      <ActionMenu open={!!prioFor} onClose={() => setPrioFor(null)} title={t('td.priority')} items={prioItems} />
      <ActionMenu open={!!statusFor} onClose={() => setStatusFor(null)} title={t('meet.status')} items={statusItems} />

      <NewTaskSheet
        open={!!creating}
        onClose={closeCreate}
        p={p}
        me={me}
        parentId={creating?.parentId ?? null}
        parentTitle={creating?.parentTitle}
        onCreated={data.reload}
      />

      <TaskSheet
        open={!!detailFor}
        onClose={() => setDetailFor(null)}
        task={detailFor}
        p={p}
        me={me}
        statuses={statuses}
        onSaved={data.reload}
      />

      <TransferSheet
        open={!!transferFor}
        onClose={() => setTransferFor(null)}
        p={p}
        task={transferFor}
        me={me}
        busy={busy}
        onTransfer={transfer}
      />

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        projectId={p.id}
        onImported={data.reload}
      />

      <VoiceTaskWizard
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        p={p}
        me={me}
        onCreated={data.reload}
      />

      {/* Suppression — même conséquence annoncée que sur le web. */}
      <Confirm
        open={!!delFor}
        onClose={() => setDelFor(null)}
        title={delFor ? `${t('action.delete')} « ${delFor.title} » ?` : t('action.delete')}
        message={delFor
          ? `${t('qa.task')} « ${delFor.title} »${p.tasks.some((y) => y.parentId === delFor.id) ? t('pd.andSubs2') : ''} — ${t('pd.irrev')}`
          : undefined}
        confirmLabel={t('pd.yesDel')}
        tone="danger"
        loading={busy}
        onConfirm={confirmDelete}
      />
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: 18 },
  tools: { paddingTop: 12, paddingBottom: 6 },
  banner: { marginBottom: 10 },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filter: { marginBottom: 8 },
  group: { marginTop: 10, marginBottom: 6 },
  more: { marginTop: 8, alignSelf: 'center' },
})
