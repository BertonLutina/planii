import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Banner, EmptyState, SkeletonList } from '@/components/ui'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { TaskEvent } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { errMsg } from '../lib/flow'

const EVENT_KEY: Record<string, string> = {
  task_created: 'pd.evCreated',
  task_done: 'pd.evDone',
  task_reopened: 'pd.evReopened',
  task_status_changed: 'pd.evStatus',
  task_transferred: 'pd.evTransferred',
  task_hours_updated: 'pd.evHours',
  task_priority_changed: 'pd.evPrio',
  task_updated: 'pd.evUpdated',
  task_claimed: 'pd.evClaimed',
  task_reminded: 'pd.evReminded',
  task_deleted: 'pd.evDeleted',
  comment_added: 'pd.evCAdd',
  comment_deleted: 'pd.evCDel',
}

const stamp = (at: string) =>
  new Date(at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Journal d'une tâche (`GET /tasks/:id/events`). */
export function TaskHistory({ taskId }: { taskId: string }) {
  const { c } = useTheme()
  const [items, setItems] = useState<TaskEvent[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api<{ events: TaskEvent[] }>('GET', '/tasks/' + taskId + '/events')
      .then((r) => { if (alive) setItems(r.events) })
      .catch((e) => { if (alive) setErr(errMsg(e)) })
    return () => { alive = false }
  }, [taskId])

  if (err) return <Banner text={err} tone="danger" icon="alert" />
  if (!items) return <SkeletonList count={4} itemHeight={46} />

  return (
    <FlatList
      data={items}
      keyExtractor={(x) => x.id}
      contentContainerStyle={s.list}
      ListEmptyComponent={<EmptyState icon="activity" title={t('pd.noHistory')} />}
      renderItem={({ item }) => (
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: c.accent }]} />
          <View style={s.body}>
            <Text style={[s.title, { color: c.text }]}>{t(EVENT_KEY[item.type] ?? item.type)}</Text>
            <Text style={[s.sub, { color: c.muted }]}>{item.actorName} · {stamp(item.at)}</Text>
          </View>
        </View>
      )}
    />
  )
}

const s = StyleSheet.create({
  list: { paddingBottom: 12, gap: 12 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 2 },
})
