import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ActionMenu, Banner, Button, Confirm, EmptyState, Fab, Ic, NATIVE_TAB_BAR,
  type ActionItem,
} from '@/components/ui'
import { NotifBell } from '@/components/NotifBell'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { Dir, ProjSort } from '@/lib/sort'
import type { ProjectSummary } from '@/lib/types'
import { HelpButton } from '@/screens/guide'
import { afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from '@/screens/project/lib/flow'
import {
  EditProjectSheet, NewProjectSheet, ProjectCard, ProjectsSkeleton, ReorderRail,
  useProjectsList,
} from '@/screens/projects'
import { PvThemeScope, usePv, useTheme } from '@/theme/ThemeProvider'

/* Projets — portage de `ProjectsList` (planii-vite/src/components/Projects.tsx).
 * (`JoinModal` est déjà porté en écran de pile : app/invite/[token].tsx.)
 *
 * Deux choses du web ne traversent pas :
 *   — la vue « tableau » à sept colonnes, illisible sous 700 px : la carte
 *     porte déjà les mêmes données, en pile ;
 *   — le glisser-déposer de réordonnancement, remplacé par « Précédent /
 *     Suivant » (rail visible + menu de la carte), qui appelle le même
 *     `PUT /projects/order`.
 *
 * La légende des libellés du web disparaît aussi : chaque carte porte déjà sa
 * pastille de couleur et son nom — une légende séparée ne ferait que répéter.
 */

/** La page Projets vit dans la palette du prototype (clair et sombre), comme la page projet. */
export default function ProjetsScreen() {
  return <PvThemeScope><Projets /></PvThemeScope>
}

function Projets() {
  const { c } = useTheme()
  const pv = usePv()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me } = useSession()
  useI18n()

  const P = useProjectsList()
  const { counts } = P
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState('')
  const q = search.trim().toLowerCase()
  const filtering = !!q || !!labelFilter
  const labelKey = (x?: string | null) => (x || '').trim().toLowerCase()
  const list = useMemo(() => (P.list ? P.list.filter((p) => (
    (!q || p.name.toLowerCase().includes(q)) && (!labelFilter || labelKey(p.labelName) === labelFilter)
  )) : P.list), [P.list, q, labelFilter])
  const labels = P.labels
  /* L'ordre manuel se calcule sur la liste complète : jamais pendant une recherche ou un filtre. */
  const canReorder = P.canReorder && !filtering

  const [newOpen, setNewOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<ProjectSummary | null>(null)
  const [editFor, setEditFor] = useState<ProjectSummary | null>(null)
  const [delFor, setDelFor] = useState<ProjectSummary | null>(null)
  const [sortOpen, setSortOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const openProject = useCallback((id: string) => {
    router.push({ pathname: '/project/[id]', params: { id } })
  }, [router])

  const move = useCallback((id: string, delta: -1 | 1) => {
    P.move(id, delta).catch((e) => toastErrAfterSheet(errMsg(e)))
  }, [P])

  /** Suppression — même conséquence annoncée que sur le web, mot pour mot. */
  async function confirmDelete() {
    const p = delFor
    if (!p) return
    setDeleting(true)
    try {
      const r = await api<{ notified: number }>('DELETE', '/projects/' + p.id)
      setDeleting(false)
      setDelFor(null)
      toastAfterSheet(r.notified > 0 ? t('pd.delNotif', { n: r.notified }) : t('pd.delOk'))
      P.load(1, false)
    } catch (e) {
      setDeleting(false)
      setDelFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }

  const sortLabel = P.sort === 'manual'
    ? t('projects.sortManual')
    : `${t('projects.sortTitle')} ${P.dir === 'asc' ? 'A → Z' : 'Z → A'}`

  const sortItems: ActionItem[] = useMemo(() => {
    const pick = (sort: ProjSort, dir: Dir) => () => { P.setSort(sort); P.setDir(dir) }
    return [
      { label: `${t('projects.sortTitle')} A → Z`, icon: 'sort', onPress: pick('title', 'asc') },
      { label: `${t('projects.sortTitle')} Z → A`, icon: 'sort', onPress: pick('title', 'desc') },
      { label: t('projects.sortManual'), icon: 'grip', onPress: pick('manual', 'asc') },
    ]
  }, [P])

  const cardItems: ActionItem[] = useMemo(() => {
    const p = menuFor
    if (!p || !list) return []
    const owner = !!me && me.id === p.owner_id
    const i = list.findIndex((x) => x.id === p.id)
    const out: ActionItem[] = [
      { label: t('g.projets.s3t'), icon: 'folder', onPress: () => afterSheet(() => openProject(p.id)) },
    ]
    if (canReorder) {
      out.push({ label: t('guide.prev'), icon: 'chevron-up', disabled: i <= 0, onPress: () => move(p.id, -1) })
      out.push({ label: t('guide.next'), icon: 'chevron-down', disabled: i < 0 || i >= list.length - 1, onPress: () => move(p.id, 1) })
    }
    if (owner) {
      out.push({ label: t('action.edit'), icon: 'edit', onPress: () => afterSheet(() => setEditFor(p)) })
      out.push({ label: t('action.delete'), icon: 'trash', tone: 'danger', onPress: () => afterSheet(() => setDelFor(p)) })
    }
    return out
  }, [menuFor, list, me, canReorder, move, openProject])

  /* Libellés réellement portés par les projets chargés (+ ceux du compte). */
  const chipLabels = useMemo(() => {
    const by = new Map<string, { id: string; label: string; color: string }>()
    labels.forEach((l) => { if (!by.has(labelKey(l.label))) by.set(labelKey(l.label), { id: l.id, label: l.label, color: l.color }) })
    ;(P.list || []).forEach((p) => {
      if (p.labelName && p.labelColor && !by.has(labelKey(p.labelName))) by.set(labelKey(p.labelName), { id: p.labelId || p.labelName, label: p.labelName, color: p.labelColor })
    })
    return [...by.values()]
  }, [labels, P.list])

  const header = (
    <View>
      <View style={s.toolsTop}>
        <View style={[s.search, { backgroundColor: pv.raised, borderColor: pv.line2 }]}>
          <Ic name="search" s={18} c={pv.hint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('pj.search')}
            placeholderTextColor={pv.hint}
            accessibilityLabel={t('pj.search')}
            returnKeyType="search"
            autoCorrect={false}
            style={[s.searchInput, { color: pv.text }]}
          />
        </View>
        <Pressable
          onPress={() => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('projects.sort')} — ${sortLabel}`}
          style={({ pressed }) => [s.sortBtn, { borderColor: pv.line2, backgroundColor: pressed ? pv.col : 'transparent' }]}
        >
          <Ic name="sort" s={18} c={pv.text} />
        </Pressable>
      </View>
      {chipLabels.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityLabel={t('proj.labelList')}>
          {chipLabels.map((l) => {
            const on = labelFilter === labelKey(l.label)
            return (
              <Pressable
                key={l.id}
                onPress={() => setLabelFilter((f) => (f === labelKey(l.label) ? '' : labelKey(l.label)))}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[s.chip, { borderColor: on ? pv.acc : pv.line, backgroundColor: on ? pv.accBg : 'transparent' }]}
              >
                <View style={[s.chipDot, { backgroundColor: l.color }]} />
                <Text style={[s.chipTxt, { color: on ? pv.accFg : pv.muted }]}>{trTerm(l.label)}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      )}
      {!!P.error && !!list?.length && (
        <Banner tone="danger" icon="alert" text={P.error} style={s.banner} />
      )}
    </View>
  )

  const footer = P.hasMore && P.sort !== 'manual'
    ? (
      <Button
        label={`${t('common.loadMore')} (${P.projects?.length ?? 0}/${P.total})`}
        variant="ghost"
        loading={P.loadingMore}
        onPress={P.loadMore}
        style={s.more}
      />
    )
    : null

  const head = (
    <View style={s.head}>
      <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: c.text }]}>
        {t('nav.projects')}
      </Text>
      <NotifBell />
      <HelpButton tab="projets" />
    </View>
  )

  const switcher = (
    <View style={s.switcher}>
      <View style={[s.seg, { backgroundColor: pv.raised, borderColor: pv.line2 }]} accessibilityRole="tablist">
        {([['active', t('projects.active'), counts.active], ['done', t('projects.done'), counts.done]] as const).map(([k, label, n]) => {
          const on = P.tab === k
          return (
            <Pressable
              key={k}
              onPress={() => P.setTab(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[s.segBtn, on && { backgroundColor: pv.col2 }]}
            >
              <Text style={[s.segTxt, { color: on ? pv.text : pv.muted }]}>{label}</Text>
              <Text style={[s.segN, { color: pv.hint }]}>{n}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )

  let body: React.ReactNode
  if (!list) {
    body = <View style={s.pad}><ProjectsSkeleton /></View>
  } else if (P.error && list.length === 0) {
    body = (
      <View style={s.pad}>
        <Banner tone="danger" icon="alert" text={P.error} />
        <Button label={t('ad.refresh')} icon="refresh" onPress={() => P.load(1, false)} style={s.retry} />
      </View>
    )
  } else {
    body = (
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <View style={[s.item, canReorder && s.itemReorder]}>
            <View style={s.grow}>
              <ProjectCard
                p={item}
                onOpen={() => openProject(item.id)}
                onMenu={() => setMenuFor(item)}
              />
            </View>
            {canReorder && (
              <ReorderRail
                index={index}
                count={list.length}
                name={item.name}
                onMove={(d) => move(item.id, d)}
              />
            )}
          </View>
        )}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          filtering
            ? <EmptyState icon="search" title={t('pj.none')} message={t('pj.noneHint')} />
            : P.tab === 'done'
            ? <EmptyState icon="circle-check" title={t('proj.noneDone')} message={t('g.projets.intro')} />
            : (
              <EmptyState
                icon="folder"
                title={t('g.projets.title')}
                message={t('g.projets.intro')}
                actionLabel={t('projects.newProject')}
                onAction={() => setNewOpen(true)}
              />
            )
        }
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + NATIVE_TAB_BAR + 88 }]}
        refreshControl={
          <RefreshControl refreshing={P.refreshing} onRefresh={P.refresh} tintColor={c.accent} colors={[c.accent]} />
        }
        showsVerticalScrollIndicator={false}
      />
    )
  }

  return (
    <View style={[s.screen, { backgroundColor: pv.bg, paddingTop: insets.top }]}>
      {head}
      {switcher}
      {body}

      {/* Dernier enfant du conteneur `flex: 1` — jamais dans une liste. */}
      <Fab onPress={() => setNewOpen(true)} accessibilityLabel={t('projects.newProject')} />

      <ActionMenu
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title={t('projects.sort')}
        items={sortItems}
      />

      <ActionMenu
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.name ?? t('pd.actions')}
        items={cardItems}
      />

      <NewProjectSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        labels={labels}
        onCreated={(id) => { setNewOpen(false); openProject(id) }}
      />

      <EditProjectSheet
        open={!!editFor}
        onClose={() => setEditFor(null)}
        project={editFor}
        labels={labels}
        onSaved={() => { setEditFor(null); P.load(1, false) }}
      />

      <Confirm
        open={!!delFor}
        onClose={() => setDelFor(null)}
        title={t('pd.delQ')}
        message={
          delFor
            ? `${t('pd.delX', { n: delFor.name })}`
              + `${Number(delFor.memberCount) > 1 ? ' ' + t('pd.delMembers', { c: Number(delFor.memberCount) - 1 }) : ''}`
              + ` ${t('pd.irrev')}`
            : undefined
        }
        confirmLabel={t('pd.yesDel')}
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { flex: 1, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  switcher: { paddingHorizontal: 18, paddingBottom: 14 },
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18 },
  toolsTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', padding: 0 },
  sortBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingBottom: 16, paddingRight: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 15, borderRadius: 18, borderWidth: 1 },
  chipDot: { width: 9, height: 9, borderRadius: 5 },
  chipTxt: { fontSize: 14, fontWeight: '700' },
  seg: { flexDirection: 'row', padding: 4, gap: 2, borderWidth: 1, borderRadius: 14, alignSelf: 'flex-start' },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 10 },
  segTxt: { fontSize: 14, fontWeight: '700' },
  segN: { fontSize: 12, fontWeight: '700' },
  banner: { marginTop: 10, alignSelf: 'stretch' },
  item: { marginBottom: 16 },
  itemReorder: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  more: { marginTop: 6, alignSelf: 'center' },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
})
