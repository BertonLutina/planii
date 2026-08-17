import { useCallback, useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Banner, Button, EmptyState, NATIVE_TAB_BAR, SkeletonList } from '@/components/ui'
import { NotifBell } from '@/components/NotifBell'
import { t, useI18n } from '@/lib/i18n'
import { TEAM_BONUS } from '@/lib/points'
import { useRealtime } from '@/lib/realtime'
import { useSession } from '@/lib/session'
import { useProjectSummaries } from '@/lib/useProjects'
import { HelpButton } from '@/screens/guide'
import { RankRow } from '@/screens/leaderboard/RankRow'
import { rankProjects } from '@/screens/leaderboard/rank'
import { useTheme } from '@/theme/ThemeProvider'

/* Classement — portage de `Leaderboard` (planii-vite/src/components/Leaderboard.tsx).
   Ce sont bien les *projets* qui sont classés, sur leurs points de tâches
   terminées (`@/lib/points`), pas les personnes : même agrégation que le web.
   Pas de podium en trois colonnes — à 320 px il écrase les noms ; une liste
   ordonnée reste lisible et se prolonge naturellement au-delà du top 3. */

export default function ClassementScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me } = useSession()
  useI18n()

  const { projects, error, reload } = useProjectSummaries()
  const [refreshing, setRefreshing] = useState(false)
  useRealtime((m) => { if (m.type === 'project') reload() })

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await reload()
    setRefreshing(false)
  }, [reload])

  const ranked = useMemo(() => (projects ? rankProjects(projects) : []), [projects])

  const openProject = useCallback((id: string) => {
    router.push({ pathname: '/project/[id]', params: { id } })
  }, [router])

  const head = (
    <View style={s.head}>
      <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: c.text }]}>
        {t('nav.leaderboard')}
      </Text>
      <NotifBell />
      <HelpButton tab="classement" />
    </View>
  )

  if (!projects) {
    return (
      <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        {head}
        <View style={s.body}>
          <SkeletonList count={5} itemHeight={62} gap={10} />
        </View>
      </View>
    )
  }

  if (error && projects.length === 0) {
    return (
      <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        {head}
        <View style={s.body}>
          <Banner tone="danger" icon="alert" text={error} />
          <Button label={t('ad.refresh')} icon="refresh" onPress={reload} style={s.retry} />
        </View>
      </View>
    )
  }

  return (
    <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {head}
      <FlatList
        data={ranked}
        keyExtractor={(r) => r.p.id}
        renderItem={({ item }) => (
          <View style={s.item}>
            <RankRow r={item} mine={!!me && item.p.owner_id === me.id} onPress={openProject} />
          </View>
        )}
        ListHeaderComponent={
          ranked.length > 0
            ? (
              <Banner
                tone="accent"
                icon="trophy"
                text={`${t('lb.banner')} +${TEAM_BONUS} pts. ${t('lb.scale')}`}
                style={s.banner}
              />
            )
            : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="trophy"
            title={t('lb.empty')}
            message={t('g.classement.intro')}
            actionLabel={t('cmd.projects')}
            onAction={() => router.push('/projets')}
          />
        }
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + NATIVE_TAB_BAR + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { flex: 1, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  body: { paddingHorizontal: 18, paddingTop: 4 },
  list: { paddingHorizontal: 18, paddingTop: 4 },
  banner: { marginBottom: 14 },
  item: { marginBottom: 10 },
  retry: { marginTop: 12, alignSelf: 'flex-start' },
})
