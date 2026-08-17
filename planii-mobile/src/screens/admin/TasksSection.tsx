import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import {
  ActionMenu, Banner, Button, Card, EmptyState, Field, GroupHeader, Ic, PriorityFlag,
  type ActionItem,
} from '@/components/ui'
import { api } from '@/lib/api'
import { formatDue } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { PRIORITIES, prio, prioMeta } from '@/lib/priority'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '@/screens/project/lib/flow'
import { useTheme } from '@/theme/ThemeProvider'
import { ErrorRetry, Meta, RowsSkeleton } from './AdminParts'
import type { ATask } from './types'
import { useAdminList } from './useAdminList'

/* Tâches — portage de `Tasks` (planii-vite/src/components/Admin.tsx).
 *
 * Le web pose sur chaque ligne les six boutons P1…P6 du sélecteur de priorité.
 * Six cibles de 44 pt côte à côte réclament 264 pt : elles mangeraient toute
 * la largeur d'un téléphone. Ici la carte porte l'information (drapeau, titre,
 * projet, responsable, échéance) et l'appui ouvre le menu des six priorités —
 * le même geste que le menu « … » d'une tâche dans l'onglet Tâches d'un projet.
 *
 * Pas de feuille de détail : les cinq champs de `adminTask` tiennent sur deux
 * lignes. En ouvrir une n'apporterait rien de plus à lire.
 *
 * Rappel utile : le serveur anonymise (`AdminView.adminTask`). Tous les titres
 * valent « Tâche anonymisée » et le nom de projet est un code « Projet #A1B2C3 » —
 * la recherche porte donc de fait sur ce code, comme sur le web. */

export function TasksSection({ padBottom }: { padBottom: number }) {
  const { c } = useTheme()
  const L = useAdminList<ATask>('/admin/tasks', 50)

  const [q, setQ] = useState('')
  const [prioFor, setPrioFor] = useState<ATask | null>(null)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = L.items ?? []
    if (!needle) return out
    return out.filter((x) => (
      (x.title + ' ' + x.projectName + ' ' + (x.assigneeName || '')).toLowerCase().includes(needle)
    ))
  }, [L.items, q])

  /* Comme le web : on retouche la ligne sur place. Recharger la page 1 ferait
     disparaître les pages suivantes déjà chargées pour un seul chiffre changé. */
  async function setPriority(x: ATask, n: number) {
    try {
      await api('PATCH', `/admin/tasks/${x.id}/priority`, { priority: n })
      L.patch((prev) => prev.map((y) => (y.id === x.id ? { ...y, priority: n } : y)))
      toastAfterSheet(t('ad.prioSet', { n }))
    } catch (e) {
      toastErrAfterSheet(errMsg(e))
    }
  }

  const prioItems: ActionItem[] = useMemo(() => {
    const x = prioFor
    if (!x) return []
    const cur = prio(x.priority)
    return PRIORITIES.map((n) => ({
      label: `${prioMeta(n).tag} · ${prioMeta(n).label}${cur === n ? ' ✓' : ''}`,
      icon: 'flag',
      disabled: cur === n,
      onPress: () => setPriority(x, n),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prioFor])

  const header = (
    <View style={s.tools}>
      <Banner tone="accent" icon="lock" text={t('ad.anon')} />
      {!!L.error && !!L.items?.length && <Banner tone="danger" icon="alert" text={L.error} />}
      <Field
        placeholder={t('ad.searchTask')}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        returnKeyType="search"
        style={s.search}
      />
      <GroupHeader
        title={`${list.length}${L.total > list.length ? ` / ${L.total}` : ''} ${t('ad.tasksCnt')}`}
        style={s.group}
      />
    </View>
  )

  const footer = L.hasMore
    ? (
      <Button
        label={`${t('common.loadMore')} (${L.items?.length ?? 0}/${L.total})`}
        variant="ghost"
        loading={L.loadingMore}
        onPress={L.loadMore}
        style={s.more}
      />
    )
    : null

  if (!L.items && !L.error) return <View style={s.pad}><RowsSkeleton /></View>
  if (!L.items) return <View style={s.pad}><ErrorRetry message={L.error!} onRetry={() => L.load(1, false)} /></View>

  return (
    <View style={s.fill}>
      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => (
          <Card
            padded={12}
            onPress={() => setPrioFor(x)}
            accessibilityLabel={
              `${prioMeta(x.priority).tag}, ${x.title}, ${x.projectName}`
              + `, ${x.assigneeName ?? t('ad.unassigned')}${x.due ? ', ' + formatDue(x.due) : ''}`
              + `${x.done ? ', ' + t('ad.done') : ''} — ${t('pd.mPrio')}`
            }
            style={s.row}
          >
            <View style={s.titleRow}>
              <PriorityFlag priority={x.priority} />
              <Text
                numberOfLines={2}
                style={[s.title, { color: x.done ? c.hint : c.text }, x.done && s.struck]}
              >
                {x.title}
              </Text>
              {x.done && <Ic name="circle-check" s={17} c={c.ok} />}
            </View>
            <View style={s.meta}>
              <Meta icon="folder" text={x.projectName} />
              <Meta icon="user" text={x.assigneeName ?? t('ad.unassigned')} />
              {!!x.due && <Meta icon="calendar" text={formatDue(x.due)} />}
            </View>
          </Card>
        )}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          q.trim()
            ? <EmptyState icon="search" title={t('cmd.noResult')} message={t('ad.searchTask')} />
            : <EmptyState icon="circle-check" title={t('pd.noTasks')} message={t('g.admin.p2')} />
        }
        contentContainerStyle={[s.list, { paddingBottom: padBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={L.refreshing} onRefresh={L.refresh} tintColor={c.accent} colors={[c.accent]} />
        }
      />

      <ActionMenu
        open={!!prioFor}
        onClose={() => setPrioFor(null)}
        title={t('td.priority')}
        items={prioItems}
      />
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18 },
  tools: { paddingTop: 2 },
  search: { marginBottom: 10 },
  group: { marginTop: 4, marginBottom: 10 },
  row: { marginBottom: 10, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '700' },
  struck: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  more: { marginTop: 6, alignSelf: 'center' },
})
