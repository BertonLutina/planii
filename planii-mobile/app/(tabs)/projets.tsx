import { useCallback, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ActionMenu, Banner, Button, Confirm, EmptyState, Fab, NATIVE_TAB_BAR, Tabs,
  type ActionItem, type TabItem,
} from '@/components/ui'
import { NotifBell } from '@/components/NotifBell'
import { api } from '@/lib/api'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { Dir, ProjSort } from '@/lib/sort'
import type { ProjectSummary } from '@/lib/types'
import { HelpButton } from '@/screens/guide'
import { afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from '@/screens/project/lib/flow'
import {
  EditProjectSheet, NewProjectSheet, ProjectCard, ProjectsSkeleton, ReorderRail,
  useProjectsList, type ProjTab,
} from '@/screens/projects'
import { useTheme } from '@/theme/ThemeProvider'

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

export default function ProjetsScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me } = useSession()
  useI18n()

  const P = useProjectsList()
  const { list, labels, counts, canReorder } = P

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

  const tabs: TabItem<ProjTab>[] = [
    { key: 'active', label: `${t('projects.active')} (${counts.active})`, icon: 'folder' },
    { key: 'done', label: `${t('projects.done')} (${counts.done})`, icon: 'circle-check' },
  ]

  const header = (
    <View style={s.tools}>
      <Button
        label={sortLabel}
        icon="sort"
        size="sm"
        accessibilityLabel={`${t('projects.sort')} — ${sortLabel}`}
        onPress={() => setSortOpen(true)}
      />
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
      <Tabs items={tabs} value={P.tab} onChange={P.setTab} />
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
          P.tab === 'done'
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
    <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
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
  tools: { paddingBottom: 12, alignItems: 'flex-start' },
  banner: { marginTop: 10, alignSelf: 'stretch' },
  item: { marginBottom: 12 },
  itemReorder: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  more: { marginTop: 6, alignSelf: 'center' },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
})
