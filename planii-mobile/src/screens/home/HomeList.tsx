import { useMemo } from 'react'
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native'
import { EmptyState } from '@/components/ui'
import { t, trTerm } from '@/lib/i18n'
import type { Task } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { HomeTaskRow } from './HomeTaskRow'
import type { MyTask, StatusGroup } from './useHome'

/* Vue « liste » — mes tâches groupées par statut, comme le web.
   Le web permet de faire glisser une tâche d'un groupe à l'autre ; ici le
   changement de statut passe par le menu « … » de la rangée. */

export interface HomeListProps {
  groups: StatusGroup[]
  /** Vrai s'il n'y a aucune tâche à moi, tous statuts confondus. */
  empty: boolean
  refreshing: boolean
  onRefresh: () => void
  onOpen: (projectId: string) => void
  onToggle: (task: Task) => void
  onMenu: (item: MyTask) => void
  /** Action de l'état vide — créer un projet. */
  onCreate: () => void
  header?: React.ReactElement | null
  contentPaddingBottom?: number
}

interface Section { key: string; color: string; label: string; data: MyTask[] }

export function HomeList({
  groups, empty, refreshing, onRefresh, onOpen, onToggle, onMenu, onCreate,
  header, contentPaddingBottom = 24,
}: HomeListProps) {
  const { c } = useTheme()

  const sections = useMemo<Section[]>(
    () => (empty ? [] : groups.map((g) => ({
      key: g.status.key,
      /* Couleur de statut : donnée serveur (contenu). Elle ne porte que la
         pastille — le nom du statut reste écrit à côté. */
      color: g.status.color,
      label: trTerm(g.status.label),
      data: g.items,
    }))),
    [groups, empty],
  )

  return (
    <SectionList
      sections={sections}
      keyExtractor={(x) => x.t.id}
      renderItem={({ item }) => (
        <View style={s.item}>
          <HomeTaskRow
            task={item.t}
            projectName={item.p.name}
            onOpen={() => onOpen(item.p.id)}
            onToggle={() => onToggle(item.t)}
            onMenu={() => onMenu(item)}
          />
        </View>
      )}
      renderSectionHeader={({ section }) => {
        const sec = section as unknown as Section
        return (
          <View accessibilityRole="header" style={[s.head, { backgroundColor: c.bg }]}>
            <View style={[s.dot, { backgroundColor: sec.color }]} />
            <Text numberOfLines={1} style={[s.headTxt, { color: c.text }]}>{sec.label}</Text>
            <Text style={[s.headCount, { color: c.muted }]}>{sec.data.length}</Text>
          </View>
        )
      }}
      renderSectionFooter={({ section }) => {
        const sec = section as unknown as Section
        if (sec.data.length > 0) return null
        return <Text style={[s.none, { color: c.muted }]}>{t('home.noTasks')}</Text>
      }}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon="circle-check"
          title={t('home.allDone')}
          message={t('g.accueil.intro')}
          actionLabel={t('projects.newProject')}
          onAction={onCreate}
        />
      }
      stickySectionHeadersEnabled
      contentContainerStyle={[s.body, { paddingBottom: contentPaddingBottom }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
      }
      showsVerticalScrollIndicator={false}
    />
  )
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  headTxt: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800' },
  headCount: { fontSize: 12.5, fontWeight: '700' },
  none: { fontSize: 12.5, paddingBottom: 4 },
  item: { marginBottom: 8 },
})
