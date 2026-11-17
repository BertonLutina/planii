import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ActionMenu, Button, Confirm, Ic,
  type ActionItem,
} from '@/components/ui'
import { VoiceTaskWizard } from '@/components/VoiceTaskWizard'
import { api } from '@/lib/api'
import { isOverdue } from '@/lib/dates'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { speechSupported } from '@/lib/speech'
import { PRIORITIES, prio, prioMeta } from '@/lib/priority'
import { taskComparator, type Dir, type TaskSort } from '@/lib/sort'
import type { Project, Task, TaskStatus, User } from '@/lib/types'
import { usePv } from '@/theme/ThemeProvider'
import { afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'
import { taskPerms } from '../lib/perms'
import { statusOf } from '../lib/statuses'
import type { ProjectData } from '../lib/useProjectData'
import { ImportWizard } from './ImportWizard'
import { PvAvatar } from '../pv/PvBits'
import { mix } from '../pv/colors'
import { NewTaskSheet } from './TaskFormSheet'
import { TaskCard } from './TaskCard'
import { TaskSheet } from './TaskSheet'
import { TransferSheet } from './TransferSheet'

/* Onglet « Tâches » — refonte « page projet v3 », version mobile du prototype validé
   (planii-vite/src/components/ProjectDetail.tsx + TaskTable.tsx, section « mobile » de project-v3.css).

   — Une carte par statut (les statuts vides sont masqués et listés en bas), « Terminé » replié.
   — Recherche, filtre de statut et tri en haut ; personnes et statuts en pastilles qui défilent.
   — Bouton flottant « + », avec le micro et l'import au-dessus (comme le web mobile).
   — Les sous-tâches se déplient sous leur carte par la pastille « x/y ».
   — Le glisser-déposer d'ordre devient « Précédent / Suivant » dans le menu de la tâche. */

export interface TasksTabProps {
  p: Project
  me: User
  statuses: TaskStatus[]
  data: ProjectData
  /** En-tête du projet : placé en tête de la liste, il défile avec les tâches (comme la page web). */
  top?: ReactNode
}

type Row =
  | { kind: 'group'; key: string; status: TaskStatus; tasks: Task[]; collapsed: boolean }
  | {
    kind: 'task'; key: string; task: Task; sub: boolean
    subCount: number; subDone: number; open: boolean
  }
  | { kind: 'add'; key: string; statusKey: string }
  | { kind: 'empties'; key: string; list: TaskStatus[] }

interface Creating { parentId: string | null; parentTitle?: string; status?: string; assignee?: string }

export function TasksTab({ p, me, statuses, data, top }: TasksTabProps) {
  const insets = useSafeAreaInsets()
  const pv = usePv()
  const accent = pv.acc
  useI18n()

  const [sort, setSort] = useState<TaskSort>('priority')
  const [dir, setDir] = useState<Dir>('asc')
  const [filterUser, setFilterUser] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [onlyLate, setOnlyLate] = useState(false)
  /** Le groupe « Terminé » démarre replié, comme sur le web. */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ done: true })
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({})
  const [shownEmpty, setShownEmpty] = useState<Record<string, boolean>>({})

  const [filterOpen, setFilterOpen] = useState(false)
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

  const closeCreate = useCallback(() => setCreating(null), [])
  /** Création depuis une section ou le bouton flottant : statut et personne présélectionnés. */
  const presetFor = useCallback((status?: string): Creating => ({
    parentId: null,
    status,
    assignee: filterUser !== 'all' && filterUser !== 'none' ? filterUser : undefined,
  }), [filterUser])

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

  const q = search.trim().toLowerCase()
  const matches = useCallback((x: Task) => {
    if (onlyLate && !isOverdue(x) && !p.tasks.some((y) => y.parentId === x.id && isOverdue(y))) return false
    if (!q) return true
    return x.title.toLowerCase().includes(q) || (x.description || '').toLowerCase().includes(q)
      || p.tasks.some((y) => y.parentId === x.id && y.title.toLowerCase().includes(q))
  }, [onlyLate, q, p.tasks])
  /** Ordre manuel : calculé sur toutes les tâches racines, sans les filtres. */
  const allRoots = useMemo(() => p.tasks.filter((x) => !x.parentId).slice().sort(cmp), [p.tasks, cmp])
  const roots = useMemo(() => allRoots.filter(matches), [allRoots, matches])
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
    const ids = allRoots.map((x) => x.id)
    const from = ids.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    run(() => api('PUT', '/projects/' + p.id + '/tasks/order', { ids }))
  }, [allRoots, p.id, run])

  /* ── Groupes (un par statut) ───────────────────────────────────────── */

  const personTasks = useMemo(() => roots.filter((x) => (
    filterUser === 'all'
    || (filterUser === 'none'
      ? !x.assigneeId
      : x.assigneeId === filterUser || x.transferredFrom === filterUser || x.transferredTo === filterUser)
  )), [roots, filterUser])
  const statusCount = (k: string) => personTasks.filter((x) => statusOf(x) === k).length

  const rows = useMemo<Row[]>(() => {
    const groups = statuses
      .filter((st) => statusFilter === 'all' || st.key === statusFilter)
      .map((st) => ({ status: st, tasks: personTasks.filter((x) => statusOf(x) === st.key) }))
      .filter((g) => g.tasks.length > 0 || shownEmpty[g.status.key] || statusFilter === g.status.key)
    const empties = statusFilter === 'all' ? statuses.filter((st) => !groups.some((g) => g.status.key === st.key)) : []

    const out: Row[] = []
    for (const g of groups) {
      const isCol = !!collapsed[g.status.key]
      out.push({ kind: 'group', key: 'g:' + g.status.key, status: g.status, tasks: g.tasks, collapsed: isCol })
      if (isCol) continue
      for (const x of g.tasks) {
        const subs = subsOf(x.id)
        const open = !!openSubs[x.id]
        out.push({
          kind: 'task', key: x.id, task: x, sub: false,
          subCount: subs.length, subDone: subs.filter((y) => y.done).length, open,
        })
        if (open) {
          for (const sx of subs) {
            out.push({ kind: 'task', key: sx.id, task: sx, sub: true, subCount: 0, subDone: 0, open: false })
          }
        }
      }
      if (!closed) out.push({ kind: 'add', key: 'a:' + g.status.key, statusKey: g.status.key })
    }
    if (empties.length > 0) out.push({ kind: 'empties', key: 'empties', list: empties })
    return out
  }, [statuses, statusFilter, personTasks, shownEmpty, collapsed, openSubs, subsOf, closed])

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
    const i = allRoots.findIndex((y) => y.id === x.id)
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
      out.push({ label: t('guide.next'), icon: 'chevron-down', disabled: i < 0 || i >= allRoots.length - 1, onPress: () => move(x.id, 1) })
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
  }, [menuFor, p, me, allRoots, closed, sort, claim, remind, move])

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

  const overdueCount = useMemo(() => p.tasks.filter((x) => isOverdue(x)).length, [p.tasks])

  const filterLabel = statusFilter === 'all'
    ? t('pv.filter')
    : trTerm(statuses.find((st) => st.key === statusFilter)?.label ?? t('pv.filter'))

  const filterItems: ActionItem[] = useMemo(() => [
    { label: `${t('pd.allStatuses')}${statusFilter === 'all' ? ' ✓' : ''}`, icon: 'board', onPress: () => setStatusFilter('all') },
    ...statuses.map((st) => ({
      label: `${trTerm(st.label)}${statusFilter === st.key ? ' ✓' : ''}`,
      icon: 'circle',
      onPress: () => setStatusFilter(st.key),
    })),
  ], [statuses, statusFilter])

  const header = (
    <View>
      {top}
      <View style={s.tools}>
        <View style={[s.search, { backgroundColor: pv.raised, borderColor: pv.line2 }]}>
          <Ic name="search" s={18} c={pv.hint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('pv.search')}
            placeholderTextColor={pv.hint}
            accessibilityLabel={t('pv.search')}
            returnKeyType="search"
            autoCorrect={false}
            style={[s.searchInput, { color: pv.text }]}
          />
        </View>
        <View style={s.toolRow}>
          <ToolBtn icon="filter" label={filterLabel} a11y={t('pv.filter')} onPress={() => setFilterOpen(true)} />
          <ToolBtn icon="sort" label={sortLabel} a11y={`${t('projects.sort')} — ${sortLabel}`} onPress={() => setSortOpen(true)} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pills}
        accessibilityLabel={t('pv.byPerson')}
      >
        <Pill on={filterUser === 'all'} onPress={() => setFilterUser('all')} label={t('pd.everyone')} />
        {p.members.map((m) => (
          <Pill
            key={m.id}
            on={filterUser === m.id}
            onPress={() => setFilterUser(m.id)}
            label={m.name.split(' ')[0]}
            lead={<PvAvatar name={m.name} size={24} />}
          />
        ))}
        <Pill on={filterUser === 'none'} onPress={() => setFilterUser('none')} label={t('pd.toTakeCap')} />
        {overdueCount > 0 && (
          <Pill
            late
            on={onlyLate}
            onPress={() => setOnlyLate((v) => !v)}
            label={t('pv.lateN', { n: overdueCount })}
            lead={<Ic name="alert" s={16} c={pv.dg} />}
          />
        )}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills2} accessibilityLabel={t('meet.status')}>
        <Pill on={statusFilter === 'all'} onPress={() => setStatusFilter('all')} label={`${t('pv.all')} ${personTasks.length}`} />
        {statuses.map((st) => (
          <Pill
            key={st.key}
            on={statusFilter === st.key}
            onPress={() => setStatusFilter(st.key)}
            label={`${trTerm(st.label)} ${statusCount(st.key)}`}
            lead={<View style={[s.sdot, { backgroundColor: st.color }]} />}
            compact
          />
        ))}
      </ScrollView>
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

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'group') {
      const who = [...new Set(item.tasks.map((x) => x.assigneeId).filter(Boolean))] as string[]
      const n = item.tasks.length
      return (
        <Pressable
          onPress={() => setCollapsed((v) => ({ ...v, [item.status.key]: !v[item.status.key] }))}
          accessibilityRole="button"
          accessibilityState={{ expanded: !item.collapsed }}
          accessibilityLabel={`${trTerm(item.status.label)} — ${n} ${t('pd.taskCount')}`}
          style={s.ghead}
        >
          <View style={{ transform: [{ rotate: item.collapsed ? '-90deg' : '0deg' }] }}>
            <Ic name="chevron-down" s={18} c={pv.hint} />
          </View>
          <View style={[s.gdot, { backgroundColor: item.status.color }]} />
          <Text style={[s.gname, { color: mix(item.status.color, pv.text, 58) }]} numberOfLines={1}>{trTerm(item.status.label)}</Text>
          <Text style={[s.gcount, { color: pv.hint }]}>{n} {t('pd.taskCount')}</Text>
          <View style={s.grow} />
          <View style={s.stack}>
            {who.slice(0, 4).map((id, i) => (
              <PvAvatar
                key={id}
                name={p.members.find((m) => m.id === id)?.name}
                size={28}
                style={[s.stackAv, { borderColor: pv.surface }, i === 0 && { marginLeft: 0 }]}
              />
            ))}
          </View>
        </Pressable>
      )
    }
    if (item.kind === 'add') {
      return (
        <Pressable
          onPress={() => setCreating(presetFor(item.statusKey))}
          accessibilityRole="button"
          accessibilityLabel={t('pv.addTask')}
          style={[s.addrow, { borderColor: pv.line2 }]}
        >
          <Ic name="plus" s={18} c={pv.hint} />
          <Text style={{ color: pv.hint, fontSize: 14, fontWeight: '600' }}>{t('pv.addTask')}</Text>
        </Pressable>
      )
    }
    if (item.kind === 'empties') {
      return (
        <View style={s.empties}>
          <Text style={{ color: pv.hint, fontSize: 14 }}>{t('pv.emptyStatuses')}</Text>
          {item.list.map((st) => (
            <Pressable
              key={st.key}
              onPress={() => setShownEmpty((v) => ({ ...v, [st.key]: true }))}
              accessibilityRole="button"
              style={[s.emptyBtn, { borderColor: pv.line2 }]}
            >
              <Text style={{ color: pv.muted, fontSize: 13.5, fontWeight: '600' }}>{trTerm(st.label)}</Text>
            </Pressable>
          ))}
        </View>
      )
    }
    return (
      <TaskCard
        task={item.task}
        p={p}
        me={me}
        statuses={statuses}
        sub={item.sub}
        subCount={item.subCount}
        subDone={item.subDone}
        open={item.open}
        onToggleSubs={item.subCount > 0 ? () => setOpenSubs((v) => ({ ...v, [item.task.id]: !v[item.task.id] })) : undefined}
        onOpen={() => setDetailFor(item.task)}
        onCheck={() => toggleDone(item.task)}
        onStatus={() => setStatusFor(item.task)}
        onPrio={() => setPrioFor(item.task)}
        onMenu={() => setMenuFor(item.task)}
      />
    )
  }

  const noTasks = p.tasks.length === 0 && !data.tasksLoading

  return (
    <View style={s.fill}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        ItemSeparatorComponent={Gap}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <View style={[s.empty, { borderColor: pv.line2 }]}>
            <Text style={[s.emptyT, { color: pv.text }]}>{noTasks ? t('pv.noTaskT') : t('cmd.noResult')}</Text>
            {noTasks && <Text style={{ color: pv.muted, textAlign: 'center' }}>{closed ? t('pd.closedRO') : t('pd.noTasks')}</Text>}
          </View>
        }
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + (closed ? 24 : 200) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={data.tasksLoading} onRefresh={data.reload} tintColor={accent} colors={[accent]} />
        }
      />

      {/* Boutons flottants (mobile) : micro et import au-dessus du « + ». */}
      {!closed && (
        <View style={s.fab} pointerEvents="box-none">
          {voiceOk && (
            <Pressable
              onPress={() => setVoiceOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('pd.dictate')}
              style={[s.fabSm, { backgroundColor: pv.raised, borderColor: pv.line2 }]}
            >
              <Ic name="mic" s={20} c={pv.text} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setImportOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('imp.title')}
            style={[s.fabSm, { backgroundColor: pv.raised, borderColor: pv.line2 }]}
          >
            <Ic name="upload" s={20} c={pv.text} />
          </Pressable>
          <Pressable
            onPress={() => setCreating(presetFor())}
            accessibilityRole="button"
            accessibilityLabel={t('qt.title')}
            style={({ pressed }) => [s.fabMain, { backgroundColor: pv.acc, shadowColor: pv.accShadow, opacity: pressed ? 0.88 : 1 }]}
          >
            <Ic name="plus" s={26} c={pv.onAcc} strokeWidth={2.4} />
          </Pressable>
        </View>
      )}

      <ActionMenu open={filterOpen} onClose={() => setFilterOpen(false)} title={t('pv.filter')} items={filterItems} />
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
        statuses={statuses}
        presetStatus={creating?.status}
        presetAssignee={creating?.assignee}
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
  list: { paddingHorizontal: 20 },
  grow: { flex: 1 },
  tools: { paddingTop: 14, paddingBottom: 4, gap: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  toolRow: { flexDirection: 'row', gap: 8 },
  pills: { gap: 8, paddingTop: 10, paddingBottom: 4, paddingRight: 20 },
  pills2: { gap: 8, paddingTop: 8, paddingBottom: 12, paddingRight: 20 },
  sdot: { width: 8, height: 8, borderRadius: 4 },
  ghead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, marginTop: 6 },
  gdot: { width: 12, height: 12, borderRadius: 4 },
  gname: { fontSize: 16, fontWeight: '800', letterSpacing: -0.16, flexShrink: 1 },
  gcount: { fontSize: 14, fontWeight: '500' },
  stack: { flexDirection: 'row' },
  stackAv: { marginLeft: -8, borderWidth: 2 },
  addrow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 18, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14 },
  empties: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  emptyBtn: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 34, alignItems: 'center', gap: 4, marginTop: 6 },
  emptyT: { fontSize: 16, fontWeight: '700' },
  more: { marginTop: 8, alignSelf: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 20, alignItems: 'center', gap: 12 },
  fabSm: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fabMain: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.42, shadowRadius: 12, elevation: 8,
  },
})

const Gap = () => <View style={{ height: 12 }} />

/** Bouton d'outil (Filtrer / Trier) : `.pv-btn.ghost` — 42 pt, bord `line2`. */
function ToolBtn({ icon, label, a11y, onPress }: { icon: string; label: string; a11y: string; onPress: () => void }) {
  const pv = usePv()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [tb.btn, { borderColor: pv.line2, backgroundColor: pressed ? pv.col : 'transparent' }]}
    >
      <Ic name={icon} s={18} c={pv.text} />
      <Text numberOfLines={1} style={[tb.txt, { color: pv.text }]}>{label}</Text>
    </Pressable>
  )
}

/** Pastille de filtre (`.pv-who button`, `.pv-fchips button`) : 38 pt, rayon 19. */
function Pill({ label, on, onPress, lead, late = false, compact = false }: {
  label: string; on: boolean; onPress: () => void; lead?: React.ReactNode; late?: boolean; compact?: boolean
}) {
  const pv = usePv()
  const bg = late ? pv.dgBg : on ? pv.accBg : 'transparent'
  const border = late ? (on ? pv.dg : 'transparent') : on ? pv.acc : pv.line
  const fg = late ? pv.dg : on ? pv.accFg : pv.muted
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={[tb.pill, { backgroundColor: bg, borderColor: border, paddingLeft: lead && !compact ? 6 : 15, paddingRight: 15 }]}
    >
      {lead}
      <Text numberOfLines={1} style={[tb.pillTxt, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

const tb = StyleSheet.create({
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  txt: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 19, borderWidth: 1 },
  pillTxt: { fontSize: 14, fontWeight: '700' },
})
