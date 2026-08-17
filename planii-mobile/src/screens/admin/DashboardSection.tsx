import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Avatar, Banner, Card, EmptyState, SectionHeader, StatCard, priorityColors } from '@/components/ui'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { prioMeta } from '@/lib/priority'
import { errMsg } from '@/screens/project/lib/flow'
import { useTheme } from '@/theme/ThemeProvider'
import { Bars, type BarDatum } from './Bars'
import { DashSkeleton, ErrorRetry } from './AdminParts'
import { fmtAgo, fmtDay } from './format'
import type { AStats } from './types'

/* Tableau de bord — portage de `Dashboard` (planii-vite/src/components/Admin.tsx).
 *
 * Le web dispose six tuiles puis quatre cartes en grille. Sur un téléphone la
 * grille tombe en une colonne : les tuiles restent à deux par ligne (elles ne
 * portent qu'un nombre), les graphiques passent pleine largeur.
 *
 * La liste des dernières connexions est la *donnée* de cette section : elle
 * porte la `FlatList` (clé = e-mail), tout le reste est son en-tête. C'est ce
 * qui donne le tiré-pour-rafraîchir sans imbriquer une liste dans un
 * `ScrollView`. */

const TYPE_KEY: Record<string, string> = {
  solo: 'proj.typeSolo', team: 'proj.typeTeam', group: 'proj.typeGroup',
}

export function DashboardSection({ padBottom }: { padBottom: number }) {
  const { c } = useTheme()
  const [stats, setStats] = useState<AStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api<{ stats: AStats }>('GET', '/admin/stats')
      setStats(r.stats)
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = useCallback(() => {
    setRefreshing(true)
    load().finally(() => setRefreshing(false))
  }, [load])

  if (!stats && !error) return <View style={s.pad}><DashSkeleton /></View>
  if (!stats) return <View style={s.pad}><ErrorRetry message={error!} onRetry={load} /></View>

  const cards: { key: string; value: string | number; label: string; icon: string; tone: 'accent' | 'ok' | 'blue' | 'danger' }[] = [
    { key: 'users', value: stats.users, label: t('ad.users'), icon: 'user', tone: 'accent' },
    { key: 'active', value: stats.activeUsers7, label: t('ad.active7'), icon: 'activity', tone: 'ok' },
    { key: 'projects', value: `${stats.projectsActive}/${stats.projects}`, label: t('ad.projects'), icon: 'folder', tone: 'blue' },
    { key: 'tasks', value: stats.tasks, label: t('ad.tasks'), icon: 'tasks', tone: 'accent' },
    { key: 'done', value: `${stats.tasksDone} · ${stats.completion} %`, label: t('ad.done'), icon: 'target', tone: 'ok' },
    { key: 'late', value: stats.tasksOverdue, label: t('ad.late'), icon: 'clock-late', tone: 'danger' },
  ]

  const prioBars: BarDatum[] = stats.tasksByPriority.map((x) => {
    const m = prioMeta(x.p)
    return {
      key: 'p' + x.p,
      label: m.tag,
      value: x.c,
      color: priorityColors(c, x.p).fg,
      a11y: `${m.tag} — ${m.label} : ${x.c} ${t('pd.taskCount')}`,
    }
  })

  const typeTones = [c.accent, c.blue, c.ok]
  const typeBars: BarDatum[] = stats.projectsByType.map((x, i) => {
    const label = TYPE_KEY[x.t] ? t(TYPE_KEY[x.t]) : x.t
    return {
      key: x.t,
      label,
      value: x.c,
      color: typeTones[i % typeTones.length],
      a11y: `${label} : ${x.c} ${t('ad.projects').toLowerCase()}`,
    }
  })

  const dayBars: BarDatum[] = stats.doneByDay.map((d) => ({
    key: d.d,
    label: d.d.slice(8),
    value: d.c,
    color: c.ok,
    a11y: `${fmtDay(d.d)} : ${d.c} ${t('ad.done').toLowerCase()}`,
  }))
  const doneTotal = stats.doneByDay.reduce((a, b) => a + b.c, 0)

  const header = (
    <View>
      {/* Données à l'écran mais rafraîchissement en échec : on le dit sans vider la vue. */}
      {!!error && <Banner tone="danger" icon="alert" text={error} />}

      <View style={s.grid}>
        {cards.map((x) => (
          <StatCard key={x.key} value={x.value} label={x.label} icon={x.icon} tone={x.tone} style={s.stat} />
        ))}
      </View>

      <Bars title={t('ad.byPrio')} data={prioBars} style={s.chart} />
      <Bars title={t('ad.byType')} data={typeBars} style={s.chart} />
      <Bars
        title={t('ad.done14')}
        data={dayBars}
        compact
        footer={[fmtDay(stats.doneByDay[0]?.d ?? ''), `${t('ad.total')} ${doneTotal}`, t('ad.today')]}
        style={s.chart}
      />

      <SectionHeader title={t('ad.lastLogins')} />
    </View>
  )

  return (
    <FlatList
      data={stats.recentLogins}
      keyExtractor={(u, i) => u.email || String(i)}
      renderItem={({ item }) => (
        <Card padded={12} style={s.login}>
          <View style={s.loginRow}>
            <Avatar name={item.name} size={34} />
            <View style={s.loginBody}>
              <Text numberOfLines={1} style={[s.loginName, { color: c.text }]}>{item.name}</Text>
              <Text numberOfLines={1} style={[s.loginMail, { color: c.muted }]}>{item.email}</Text>
            </View>
            <Text style={[s.loginAgo, { color: c.hint }]}>{fmtAgo(item.lastLogin)}</Text>
          </View>
        </Card>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState icon="activity" title={t('ad.lastLogins')} message={t('ad.noLogins')} />}
      contentContainerStyle={[s.list, { paddingBottom: padBottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />
      }
    />
  )
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: '46%' },
  chart: { marginTop: 12 },
  login: { marginBottom: 10 },
  loginRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginBody: { flex: 1, minWidth: 0, gap: 2 },
  loginName: { fontSize: 14.5, fontWeight: '700' },
  loginMail: { fontSize: 12.5 },
  loginAgo: { fontSize: 12, fontWeight: '600', flexShrink: 0 },
})
