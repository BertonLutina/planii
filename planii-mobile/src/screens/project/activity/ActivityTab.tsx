import { useCallback, useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, Button, EmptyState, SkeletonList } from '@/components/ui'
import { api } from '@/lib/api'
import { t, useI18n } from '@/lib/i18n'
import type { Activity, PaginatedResponse } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { errMsg } from '../lib/flow'

/* Onglet « Activité » — portage de `ActivityTab`
   (`GET /projects/:id/activity`, réponse `{ activity | items, … }`). */

const stamp = (at: string) =>
  new Date(at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function ActivityTab({ projectId }: { projectId: string }) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  useI18n()

  const [items, setItems] = useState<Activity[] | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback((num = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setItems(null)
    setErr(null)
    api<PaginatedResponse<Activity> & { activity?: Activity[] }>(
      'GET', `/projects/${projectId}/activity?page=${num}&limit=30`,
    )
      .then((r) => {
        const batch = r.activity ?? r.items ?? []
        setItems((prev) => (append && prev ? [...prev, ...batch] : batch))
        setPage(r.page)
        setTotal(r.total)
        setHasMore(r.hasMore)
      })
      .catch((e) => { setErr(errMsg(e)); setItems((prev) => prev ?? []) })
      .finally(() => setLoadingMore(false))
  }, [projectId])

  useEffect(() => { load(1, false) }, [load])

  if (!items) return <View style={s.pad}><SkeletonList count={6} itemHeight={54} /></View>

  if (err && items.length === 0) {
    return (
      <View style={s.pad}>
        <Banner tone="danger" icon="alert" text={err} />
        <Button label={t('ad.refresh')} icon="refresh" onPress={() => load(1, false)} style={s.retry} />
      </View>
    )
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={err ? <Banner tone="danger" icon="alert" text={err} /> : null}
      ListEmptyComponent={<EmptyState icon="activity" title={t('pd.noActivity')} />}
      ListFooterComponent={hasMore
        ? (
          <Button
            label={`${t('common.loadMore')} (${items.length}/${total})`}
            variant="ghost"
            loading={loadingMore}
            onPress={() => load(page + 1, true)}
            style={s.more}
          />
        )
        : null}
      contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: c.accent }]} />
          <View style={s.body}>
            <Text style={[s.txt, { color: c.muted }]}>
              <Text style={[s.who, { color: c.text }]}>{item.user || t('pd.someone')}</Text> {item.detail}
            </Text>
            <Text style={[s.when, { color: c.hint }]}>{stamp(item.at)}</Text>
          </View>
        </View>
      )}
    />
  )
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 18, paddingTop: 12 },
  list: { paddingHorizontal: 18, paddingTop: 12, gap: 14 },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
  more: { marginTop: 10, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  body: { flex: 1, minWidth: 0 },
  txt: { fontSize: 13.5, lineHeight: 19 },
  who: { fontWeight: '700' },
  when: { fontSize: 11.5, marginTop: 3 },
})
