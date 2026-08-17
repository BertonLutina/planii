import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import {
  Banner, Button, Card, Confirm, EmptyState, Field, GroupHeader, Ic, Pill, ProgressBar,
} from '@/components/ui'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { health } from '@/lib/ui'
import { afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from '@/screens/project/lib/flow'
import { useTheme } from '@/theme/ThemeProvider'
import { ErrorRetry, Meta, RowsSkeleton } from './AdminParts'
import { ProjectSheet, typeLabel } from './ProjectSheet'
import type { AProject } from './types'
import { useAdminList } from './useAdminList'

/* Projets — portage de `Projects` (planii-vite/src/components/Admin.tsx).
 *
 * Le web aligne nom, statut, propriétaire, nombre de membres et « fait/total »
 * sur une seule ligne suivie du bouton Supprimer. Sur mobile la carte garde les
 * trois choses qu'on compare — le projet, son état, son avancement — et pousse
 * propriétaire, e-mail masqué, échéance et date de création dans la fiche, avec
 * la suppression. On évite ainsi un bouton destructeur à portée de pouce dans
 * une liste qui défile.
 *
 * Les noms sont anonymisés côté serveur (« Projet #A1B2C3 ») : la recherche
 * porte donc sur ce code et sur le propriétaire anonymisé, comme sur le web. */

export function ProjectsSection({ padBottom }: { padBottom: number }) {
  const { c } = useTheme()
  const L = useAdminList<AProject>('/admin/projects', 30)

  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<AProject | null>(null)
  const [delFor, setDelFor] = useState<AProject | null>(null)
  const [busy, setBusy] = useState(false)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = L.items ?? []
    if (!needle) return out
    return out.filter((p) => (p.name + ' ' + p.ownerName).toLowerCase().includes(needle))
  }, [L.items, q])

  async function confirmDelete() {
    const p = delFor
    if (!p) return
    setBusy(true)
    try {
      await api('DELETE', '/admin/projects/' + p.id)
      setBusy(false)
      setDelFor(null)
      toastAfterSheet(t('ad.projDeleted', { n: p.name }))
      L.load(1, false)
    } catch (e) {
      setBusy(false)
      setDelFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }

  const header = (
    <View style={s.tools}>
      <Banner tone="accent" icon="lock" text={t('ad.anon')} />
      {!!L.error && !!L.items?.length && <Banner tone="danger" icon="alert" text={L.error} />}
      <Field
        placeholder={t('ad.searchProject')}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        returnKeyType="search"
        style={s.search}
      />
      <GroupHeader
        title={`${list.length}${L.total > list.length ? ` / ${L.total}` : ''} ${t('ad.projectsCnt')}`}
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
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => {
          const h = health(Number(p.taskCount), Number(p.doneCount), p.status)
          return (
            <Card
              padded={12}
              onPress={() => setDetail(p)}
              accessibilityLabel={
                `${p.name}, ${typeLabel(p.type)}${p.status === 'done' ? ', ' + t('proj.closed') : ''}`
                + `, ${p.ownerName}, ${p.memberCount} ${t('projects.members')}`
                + `, ${h.done}/${h.total} ${t('projects.tasks')}, ${h.pct} %`
              }
              style={s.row}
            >
              <View style={s.titleRow}>
                <Text numberOfLines={1} style={[s.name, { color: c.text }]}>{p.name}</Text>
                {p.status === 'done' && <Pill label={t('proj.closed')} tone="ok" />}
                <Ic name="chevron-right" s={18} c={c.hint} />
              </View>
              <View style={s.meta}>
                <Meta icon="user" text={p.ownerName} color={c.gold} />
                <Meta icon="users" text={String(p.memberCount)} />
                <Meta icon="tasks" text={`${h.done}/${h.total}`} />
              </View>
              <View style={s.prog}>
                <ProgressBar
                  value={h.done}
                  total={h.total}
                  color={c[h.color]}
                  accessibilityLabel={`${h.pct} %`}
                  style={s.bar}
                />
                <Text style={[s.pct, { color: c[h.color] }]}>{h.pct} %</Text>
              </View>
            </Card>
          )
        }}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          q.trim()
            ? <EmptyState icon="search" title={t('cmd.noResult')} message={t('ad.searchProject')} />
            : <EmptyState icon="folder" title={t('ad.projects')} message={t('g.admin.p2')} />
        }
        contentContainerStyle={[s.list, { paddingBottom: padBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={L.refreshing} onRefresh={L.refresh} tintColor={c.accent} colors={[c.accent]} />
        }
      />

      <ProjectSheet
        open={!!detail}
        project={detail}
        onClose={() => setDetail(null)}
        onDelete={() => { const p = detail; setDetail(null); afterSheet(() => setDelFor(p)) }}
      />

      {/* Suppression — même conséquence annoncée que sur le web et que dans
          l'écran Projets : le projet, ses tâches, ses sondages, son historique,
          et les membres retirés puis avertis. */}
      <Confirm
        open={!!delFor}
        onClose={() => setDelFor(null)}
        title={t('pd.delQ')}
        message={delFor
          ? `${t('pd.delX', { n: delFor.name })}`
            + `${Number(delFor.memberCount) > 1 ? ' ' + t('pd.delMembers', { c: Number(delFor.memberCount) - 1 }) : ''}`
            + ` ${t('pd.irrev')}`
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
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18 },
  tools: { paddingTop: 2 },
  search: { marginBottom: 10 },
  group: { marginTop: 4, marginBottom: 10 },
  row: { marginBottom: 10, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  prog: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1 },
  pct: { fontSize: 12.5, fontWeight: '800', minWidth: 44, textAlign: 'right' },
  more: { marginTop: 6, alignSelf: 'center' },
})
