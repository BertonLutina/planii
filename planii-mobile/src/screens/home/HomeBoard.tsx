import { useCallback, useRef, useState } from 'react'
import {
  FlatList, RefreshControl, ScrollView, StyleSheet, Text, View,
  useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native'
import { Chip, EmptyState } from '@/components/ui'
import { t } from '@/lib/i18n'
import type { Project, Task } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { HomeTaskRow } from './HomeTaskRow'
import type { BoardCol, MyTask } from './useHome'

/* Vue « tableau » — portage du kanban de `Home` (planii-vite/src/components/Home.tsx).
 *
 * Sur le web les colonnes — **une par projet**, pas par statut — s'alignent
 * horizontalement et se lisent d'un coup d'œil. À 320 px, trois colonnes de
 * 100 px seraient illisibles ; on garde donc l'horizontalité mais une colonne
 * occupe presque tout l'écran et se feuillette au doigt, la suivante dépassant
 * de quelques points pour annoncer qu'il y en a d'autres.
 *
 * Le glissement n'est jamais la seule voie : la rangée de puces au-dessus
 * nomme chaque colonne et y saute directement — c'est aussi le seul chemin
 * praticable au lecteur d'écran. Le titre de colonne reste posé au-dessus de
 * sa propre liste : il ne défile pas avec les tâches.
 */

const GAP = 12
const SIDE = 18

export interface HomeBoardProps {
  cols: BoardCol[]
  refreshing: boolean
  onRefresh: () => void
  onOpen: (projectId: string) => void
  onToggle: (task: Task) => void
  onMenu: (item: MyTask) => void
  contentPaddingBottom?: number
}

export function HomeBoard({
  cols, refreshing, onRefresh, onOpen, onToggle, onMenu, contentPaddingBottom = 24,
}: HomeBoardProps) {
  const { c } = useTheme()
  const { width } = useWindowDimensions()
  const listRef = useRef<FlatList<BoardCol>>(null)
  const [index, setIndex] = useState(0)

  /* La colonne suivante dépasse de ~46 pt : l'utilisateur voit qu'il peut
     feuilleter sans avoir à deviner. */
  const colW = Math.min(width - SIDE - 46, 460)
  const step = colW + GAP

  const jumpTo = useCallback((i: number) => {
    setIndex(i)
    listRef.current?.scrollToOffset({ offset: i * step, animated: true })
  }, [step])

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / step)
    setIndex(Math.max(0, Math.min(i, cols.length - 1)))
  }, [step, cols.length])

  if (cols.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={[s.emptyBody, { paddingBottom: contentPaddingBottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
        }
      >
        <EmptyState icon="board" title={t('home.noTasks')} message={t('g.accueil.p2')} />
      </ScrollView>
    )
  }

  return (
    <View style={s.wrap}>
      <FlatList
        data={cols}
        keyExtractor={(col) => 'pick-' + col.p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.picker}
        style={s.pickerBox}
        accessibilityRole="tablist"
        renderItem={({ item, index: i }) => (
          <Chip
            label={item.p.name}
            tone={i === index ? 'accent' : 'neutral'}
            selected={i === index}
            onPress={() => jumpTo(i)}
          />
        )}
      />

      <FlatList
        ref={listRef}
        style={s.flex}
        data={cols}
        keyExtractor={(col) => col.p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={s.track}
        renderItem={({ item }) => (
          <Column
            col={item}
            width={colW}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpen={onOpen}
            onToggle={onToggle}
            onMenu={onMenu}
            paddingBottom={contentPaddingBottom}
          />
        )}
      />
    </View>
  )
}

function Column({
  col, width, refreshing, onRefresh, onOpen, onToggle, onMenu, paddingBottom,
}: {
  col: BoardCol
  width: number
  refreshing: boolean
  onRefresh: () => void
  onOpen: (projectId: string) => void
  onToggle: (task: Task) => void
  onMenu: (item: MyTask) => void
  paddingBottom: number
}) {
  const { c } = useTheme()
  const left = col.tasks.filter((x) => !x.done).length
  const p: Project = col.p

  return (
    <View style={[s.col, { width, backgroundColor: c.surface, borderColor: c.line }]}>
      <View accessibilityRole="header" style={[s.colHead, { borderBottomColor: c.line }]}>
        <Text numberOfLines={2} style={[s.colName, { color: c.text }]}>{p.name}</Text>
        <Text style={[s.colSub, { color: c.muted }]}>{left} {t('home.colTodo')}</Text>
      </View>
      <FlatList
        data={col.tasks}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <View style={s.item}>
            <HomeTaskRow
              task={item}
              onOpen={() => onOpen(p.id)}
              onToggle={() => onToggle(item)}
              onMenu={() => onMenu({ t: item, p })}
            />
          </View>
        )}
        contentContainerStyle={[s.colBody, { paddingBottom: paddingBottom + 12 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  flex: { flex: 1 },
  pickerBox: { flexGrow: 0, flexShrink: 0 },
  picker: { gap: 8, paddingHorizontal: SIDE, paddingBottom: 12 },
  track: { paddingLeft: SIDE, paddingRight: SIDE, gap: GAP },
  emptyBody: { paddingHorizontal: SIDE, paddingTop: 8 },
  col: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  colHead: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1 },
  colName: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
  colSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  colBody: { padding: 10 },
  item: { marginBottom: 8 },
})
