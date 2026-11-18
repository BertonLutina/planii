import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Banner, EmptyState, Ic } from '@/components/ui'
import { api } from '@/lib/api'
import { DOW, MONTHS, addDays, formatDue, isOverdue, isoLocal, parseISO, startOfWeekMon, todayMid } from '@/lib/dates'
import { t } from '@/lib/i18n'
import type { ApiCalEvent, Project, Task, TodayTask, User } from '@/lib/types'
import { useProjectSummaries } from '@/lib/useProjects'
import { alpha } from '@/screens/project/pv/colors'
import { PrioChip } from '@/screens/project/pv/PvBits'
import { usePv } from '@/theme/ThemeProvider'
import { LevelCard } from './LevelCard'
import type { MyTask, useHome } from './useHome'

/* Vue « liste » de l'accueil — version mobile de l'Accueil validé (planii-vite, `.hp`) :
   « Ta journée » (anneau + prochaine tâche), la semaine, cinq tuiles qui filtrent une seule
   liste, puis le score, l'avancement des projets et les discussions.
   Le changement de statut passe par le menu « … » de la ligne (remplace le glisser-déposer). */

type TodayKey = 'overdue' | 'dueToday' | 'highPriority' | 'transferred' | 'review'
type Home = ReturnType<typeof useHome>

export interface HomeFocusProps {
  me: User | null
  home: Home
  onOpen: (projectId: string) => void
  onOpenTask: (item: MyTask) => void
  onMenu: (item: MyTask) => void
  onCreate: () => void
  contentPaddingBottom: number
}

const TILES: { key: TodayKey; title: () => string; tone: 'dg' | 'wn' | 'ok' | 'ac'; icon: string }[] = [
  { key: 'overdue', title: () => t('today.overdue'), tone: 'dg', icon: 'alert' },
  { key: 'dueToday', title: () => t('today.dueToday'), tone: 'ac', icon: 'clock' },
  { key: 'highPriority', title: () => t('today.highPrio'), tone: 'wn', icon: 'flag' },
  { key: 'transferred', title: () => t('today.transferred'), tone: 'ac', icon: 'transfer' },
  { key: 'review', title: () => t('today.review'), tone: 'ok', icon: 'eye' },
]

export function HomeFocus({ me, home, onOpen, onOpenTask, onMenu, onCreate, contentPaddingBottom }: HomeFocusProps) {
  const pv = usePv()
  const { today, projects, mine, todo } = home
  const { projects: summaries } = useProjectSummaries()
  const [filter, setFilter] = useState<TodayKey | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [skip, setSkip] = useState(0)
  const [dayIdx, setDayIdx] = useState(() => (new Date().getDay() + 6) % 7)
  const [events, setEvents] = useState<ApiCalEvent[]>([])

  const weekStart = useMemo(() => startOfWeekMon(todayMid()), [])
  useEffect(() => {
    api<{ events: ApiCalEvent[] }>('GET', `/calendar?from=${isoLocal(weekStart)}&to=${isoLocal(addDays(weekStart, 6))}`)
      .then((r) => setEvents(r.events || [])).catch(() => setEvents([]))
  }, [weekStart])

  const byId = useMemo(() => {
    const m = new Map<string, MyTask>()
    for (const p of (projects || []) as Project[]) for (const x of p.tasks) m.set(x.id, { t: x, p })
    return m
  }, [projects])
  const rowsOf = (list: TodayTask[]) => list.map((x) => byId.get(x.id)).filter(Boolean) as MyTask[]
  const countOf = (k: TodayKey) => (today ? today[k].length : 0)

  const first = me?.firstName || (me?.name || '').split(' ')[0]
  const watch = today ? countOf('overdue') + countOf('dueToday') + countOf('highPriority') : 0
  const autoKey = (['overdue', 'dueToday', 'highPriority'] as TodayKey[]).find((k) => countOf(k) > 0)
  /* Rien d'urgent : la liste montre directement toutes les tâches à faire. */
  const allMode = showAll || (filter === null && !autoKey)
  const activeKey: TodayKey = filter ?? autoKey ?? 'highPriority'
  const listRows = allMode ? todo : rowsOf(today ? today[activeKey] : [])
  const listTitle = allMode ? t('home.todo') : TILES.find((x) => x.key === activeKey)!.title()

  /* Ta journée : en retard puis à faire aujourd'hui. */
  const queue = rowsOf([...(today?.overdue || []), ...(today?.dueToday || [])]).filter((x) => !x.t.done)
  const next = queue.length ? queue[skip % queue.length] : null
  const todayIso = isoLocal(new Date())
  const doneToday = mine.filter((x) => x.t.done && x.t.doneAt && isoLocal(new Date(x.t.doneAt)) === todayIso).length
  const dayTotal = doneToday + queue.length

  /* Cette semaine */
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { d, iso: isoLocal(d), ev: events.filter((e) => e.date === isoLocal(d)) }
  })
  const dayEvents = days[dayIdx]?.ev || []
  const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
  const now = new Date()
  const dateLabel = `${DOW[(now.getDay() + 6) % 7]} ${fmt(now)}`

  const pctOf = (p: { taskCount: number; doneCount: number }) => (p.taskCount ? Math.round((p.doneCount / p.taskCount) * 100) : 0)
  const activeSummaries = (summaries || []).filter((p) => p.status !== 'done').slice(0, 5)

  const toneOf = (tone: 'dg' | 'wn' | 'ok' | 'ac') => (
    tone === 'dg' ? { fg: pv.dg, bg: pv.dgBg }
      : tone === 'wn' ? { fg: pv.wn, bg: pv.wnBg }
        : tone === 'ok' ? { fg: pv.ok, bg: alpha(pv.ok, 0.14) }
          : { fg: pv.accFg, bg: pv.accBg }
  )

  const R = 46
  const C = 2 * Math.PI * R
  const ring = (
    <View style={s.ring} accessible accessibilityRole="progressbar" accessibilityLabel={`${doneToday}/${dayTotal}`}>
      <Svg width={112} height={112} viewBox="0 0 112 112" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={56} cy={56} r={R} stroke={pv.line2} strokeWidth={9} fill="none" />
        <Circle
          cx={56} cy={56} r={R} stroke={pv.acc} strokeWidth={9} fill="none" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - (dayTotal ? doneToday / dayTotal : 0))}
        />
      </Svg>
      <View style={s.ringTxt} pointerEvents="none">
        <Text style={[s.ringN, { color: pv.text }]}>{doneToday}/{dayTotal}</Text>
        <Text style={[s.ringS, { color: pv.muted }]}>{t('hp.done')}</Text>
      </View>
    </View>
  )

  const card = [s.card, { backgroundColor: pv.surface, borderColor: pv.line, shadowColor: '#1e145a' }]

  const header = (
    <View>
      <View style={s.hello}>
        <Text style={[s.eyebrow, { color: pv.accFg }]}>{dateLabel}</Text>
        <Text accessibilityRole="header" style={[s.h1, { color: pv.text }]}>{t('hp.hello', { n: first })}</Text>
        <Text style={{ color: pv.muted, marginTop: 6 }}>
          {!today ? t('today.loading') : watch ? t('today.watch', { n: watch }) : t('today.calm')}
        </Text>
      </View>

      {/* Ta journée */}
      <View style={[card, s.day, { backgroundColor: pv.surface }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: pv.accBg, opacity: 0.55, borderRadius: 22 }]} pointerEvents="none" />
        {ring}
        <Text style={[s.kicker, { color: pv.muted }]}>{t('hp.day')}</Text>
        {next ? (
          <>
            <Text style={[s.next, { color: pv.text }]}>{next.t.title}</Text>
            <View style={s.metaRow}>
              <View style={[s.sq, { backgroundColor: next.p.labelColor || pv.acc }]} />
              <Text style={[s.meta, { color: pv.muted }]}>{next.p.name}</Text>
              {!!next.t.due && (
                <Text style={[s.meta, { color: isOverdue(next.t) ? pv.dg : pv.muted, fontWeight: isOverdue(next.t) ? '700' : '500' }]}>
                  · {formatDue(next.t.due)}
                </Text>
              )}
            </View>
            <View style={s.act}>
              <Pressable
                onPress={() => home.toggle(next.t)}
                accessibilityRole="button"
                style={[s.btn, { backgroundColor: pv.acc, borderColor: pv.acc }]}
              >
                <Ic name="check" s={16} c={pv.onAcc} strokeWidth={2.4} />
                <Text style={[s.btnTxt, { color: pv.onAcc }]}>{t('home.finish')}</Text>
              </Pressable>
              {queue.length > 1 && (
                <Pressable onPress={() => setSkip((n) => n + 1)} accessibilityRole="button" style={[s.btn, { borderColor: pv.line2 }]}>
                  <Text style={[s.btnTxt, { color: pv.text }]}>{t('hp.skip')}</Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={[s.next, { color: pv.text }]}>{t('hp.dayDone')}</Text>
            <Text style={[s.meta, { color: pv.muted }]}>{t('hp.dayDoneHint')}</Text>
          </>
        )}
      </View>

      {/* Cette semaine */}
      <View style={[card, s.week]}>
        <View style={s.weekHead}>
          <Text style={[s.h3, { color: pv.text }]}>{t('hp.week')}</Text>
          <Text style={[s.weekRange, { color: pv.hint }]}>{fmt(days[0].d)} – {fmt(days[6].d)}</Text>
        </View>
        <View style={s.days} accessibilityRole="tablist">
          {days.map((x, i) => {
            const on = dayIdx === i
            const isToday = x.iso === todayIso
            return (
              <Pressable
                key={x.iso}
                onPress={() => setDayIdx(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[s.d, on && { backgroundColor: pv.acc }]}
              >
                <Text style={[s.dS, { color: on ? '#fff' : pv.hint }]}>{DOW[i].slice(0, 1).toUpperCase()}</Text>
                <Text style={[s.dN, { color: on ? '#fff' : isToday ? pv.accFg : pv.text }]}>{x.d.getDate()}</Text>
                <View style={s.dots}>
                  {x.ev.slice(0, 3).map((e) => {
                    const late = !e.done && !e.deadline && (parseISO(e.date) || new Date()) < todayMid()
                    return <View key={e.id} style={[s.dot, { backgroundColor: on ? '#fff' : late ? pv.dg : pv.acc }]} />
                  })}
                </View>
              </Pressable>
            )
          })}
        </View>
        <View style={s.wl}>
          {dayEvents.length === 0 && <Text style={[s.wNone, { color: pv.hint }]}>{t('hp.nothingDay')}</Text>}
          {dayEvents.slice(0, 4).map((e) => (
            <View key={e.id} style={s.wRow}>
              <Ic name={e.deadline ? 'flag' : 'calendar'} s={14} c={pv.hint} />
              <Text numberOfLines={1} style={[s.wTxt, { color: pv.text }]}>{e.title}</Text>
              {!!e.projectName && <Text numberOfLines={1} style={[s.wProj, { color: pv.hint }]}>{e.projectName}</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Tuiles : filtrent la liste */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tiles} accessibilityLabel={t('hp.filter')}>
        {TILES.map((x) => {
          const tone = toneOf(x.tone)
          const on = !allMode && activeKey === x.key
          return (
            <Pressable
              key={x.key}
              onPress={() => { setFilter(x.key); setShowAll(false) }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[s.tile, { backgroundColor: on ? tone.bg : pv.surface, borderColor: on ? tone.fg : pv.line }]}
            >
              <View style={s.tileT}>
                <View style={[s.tileIc, { backgroundColor: tone.bg }]}><Ic name={x.icon} s={15} c={tone.fg} /></View>
                <Text numberOfLines={1} style={[s.tileL, { color: pv.muted }]}>{x.title()}</Text>
              </View>
              <Text style={[s.tileN, { color: pv.text }]}>{countOf(x.key)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <View style={s.lh}>
        <Text accessibilityRole="header" style={[s.h3, { color: pv.text, fontSize: 16 }]}>{listTitle}</Text>
        <View style={[s.cnt, { backgroundColor: pv.col2 }]}><Text style={[s.cntTxt, { color: pv.muted }]}>{listRows.length}</Text></View>
      </View>
      {!!home.error && mine.length > 0 && <Banner tone="danger" icon="alert" text={home.error} style={s.banner} />}
    </View>
  )

  const footer = (
    <View>
      {(showAll || !!autoKey || filter !== null) && todo.length > 0 && (
        <Pressable
          onPress={() => { setShowAll((v) => !v); if (showAll) setFilter((f) => f ?? autoKey ?? null) }}
          accessibilityRole="button"
          style={s.more}
        >
          <Text style={[s.moreTxt, { color: pv.accFg }]}>{showAll ? t('hp.backFilter') : t('hp.seeAll', { n: todo.length })}</Text>
        </Pressable>
      )}

      <LevelCard points={home.myPoints} style={[s.level, { borderRadius: 22, borderColor: pv.line }]} />

      <View style={[card, s.proj]}>
        <Text style={[s.h3, { color: pv.text, marginBottom: 6 }]}>{t('hp.projects')}</Text>
        {activeSummaries.length === 0 && <Text style={[s.quiet, { color: pv.hint }]}>{t('hp.none')}</Text>}
        {activeSummaries.map((p, i) => {
          const color = p.labelColor || pv.acc
          return (
            <Pressable
              key={p.id}
              onPress={() => onOpen(p.id)}
              accessibilityRole="button"
              style={[s.pj, i > 0 && { borderTopWidth: 1, borderTopColor: pv.line }]}
            >
              <View style={[s.logo, { backgroundColor: alpha(color, 0.18) }]}>
                <Text style={[s.logoTxt, { color }]}>{p.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={s.nm}>
                <Text numberOfLines={1} style={[s.nmTxt, { color: pv.text }]}>{p.name}</Text>
                <View style={[s.track, { backgroundColor: pv.line2 }]}>
                  <View style={{ width: `${pctOf(p)}%`, height: '100%', borderRadius: 3, backgroundColor: pv.acc }} />
                </View>
              </View>
              <Text style={[s.pct, { color: pv.muted }]}>{pctOf(p)} %</Text>
            </Pressable>
          )
        })}
      </View>

      <View style={[card, s.proj]}>
        <Text style={[s.h3, { color: pv.text, marginBottom: 6 }]}>{t('today.discussions')}</Text>
        {!today || today.activeDiscussions.length === 0
          ? <Text style={[s.quiet, { color: pv.hint }]}>{t('today.noMeeting')}</Text>
          : today.activeDiscussions.map((d, i) => (
            <Pressable
              key={d.projectId}
              onPress={() => onOpen(d.projectId)}
              accessibilityRole="button"
              style={[s.disc, i > 0 && { borderTopWidth: 1, borderTopColor: pv.line }]}
            >
              <Text numberOfLines={1} style={[s.discN, { color: pv.text }]}>{d.projectName}</Text>
              <Text style={[s.discC, { color: pv.hint }]}>{d.count} {t('today.messages')}</Text>
            </Pressable>
          ))}
      </View>
    </View>
  )

  return (
    <FlatList
      data={listRows.slice(0, allMode ? 50 : 8)}
      keyExtractor={(x) => x.t.id}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={
        mine.length === 0
          ? <EmptyState icon="circle-check" title={t('home.allDone')} message={t('g.accueil.intro')} actionLabel={t('projects.newProject')} onAction={onCreate} />
          : <Text style={[s.quiet, { color: pv.hint, paddingVertical: 24 }]}>{t('hp.none')}</Text>
      }
      renderItem={({ item }) => (
        <FocusRow
          item={item}
          onOpen={() => onOpenTask(item)}
          onToggle={() => home.toggle(item.t)}
          onMenu={() => onMenu(item)}
        />
      )}
      contentContainerStyle={[s.body, { paddingBottom: contentPaddingBottom }]}
      refreshControl={<RefreshControl refreshing={home.refreshing} onRefresh={home.refresh} tintColor={pv.acc} colors={[pv.acc]} />}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  )
}

function FocusRow({ item, onOpen, onToggle, onMenu }: { item: MyTask; onOpen: () => void; onToggle: () => void; onMenu: () => void }) {
  const pv = usePv()
  const { t: x, p } = item
  const late = isOverdue(x as Task)
  return (
    <View style={[s.row, { backgroundColor: pv.surface, borderColor: pv.line }]}>
      <Pressable
        onPress={onToggle}
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: x.done }}
        accessibilityLabel={x.done ? t('home.reopen') : t('home.finish')}
        style={[s.box, { borderColor: x.done ? pv.ok : pv.line2, backgroundColor: x.done ? pv.ok : 'transparent' }]}
      >
        {x.done && <Ic name="check" s={13} c="#fff" strokeWidth={3} />}
      </Pressable>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={x.title} style={s.rowBody}>
        <Text
          numberOfLines={2}
          style={[s.rowT, x.done ? { color: pv.hint, fontWeight: '600', textDecorationLine: 'line-through' } : { color: pv.text }]}
        >
          {x.title}
        </Text>
        <View style={s.metaRow}>
          <View style={[s.sq, { backgroundColor: p.labelColor || pv.acc }]} />
          <Text numberOfLines={1} style={[s.rowS, { color: pv.hint }]}>{p.name}</Text>
          {!!x.due && (
            <Text style={[s.rowS, { color: late ? pv.dg : pv.hint, fontWeight: late ? '700' : '500' }]}>· {formatDue(x.due)}</Text>
          )}
        </View>
      </Pressable>
      <PrioChip priority={x.priority} />
      <Pressable onPress={onMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t('pd.actions')} — ${x.title}`} style={s.more2}>
        <Ic name="more" s={18} c={pv.hint} />
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 18 },
  hello: { marginTop: 4, marginBottom: 18 },
  eyebrow: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.9 },
  card: {
    borderWidth: 1, borderRadius: 22,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 2,
  },
  day: { padding: 22, marginBottom: 16, overflow: 'hidden' },
  ring: { width: 112, height: 112, marginBottom: 18 },
  ringTxt: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringN: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  ringS: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  kicker: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  next: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, lineHeight: 25, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  meta: { fontSize: 14 },
  sq: { width: 8, height: 8, borderRadius: 3 },
  act: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  btnTxt: { fontSize: 13, fontWeight: '700' },
  week: { padding: 20, marginBottom: 16 },
  weekHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  h3: { fontSize: 15, fontWeight: '800', flex: 1 },
  weekRange: { fontSize: 13, fontWeight: '600' },
  days: { flexDirection: 'row', gap: 4 },
  d: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 9, paddingBottom: 8, borderRadius: 14 },
  dS: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
  dN: { fontSize: 16, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  wl: { marginTop: 14, minHeight: 80, gap: 2 },
  wRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  wTxt: { flex: 1, fontSize: 14, fontWeight: '600' },
  wProj: { maxWidth: 110, fontSize: 12.5 },
  wNone: { textAlign: 'center', paddingVertical: 22 },
  tiles: { gap: 12, paddingBottom: 18, paddingRight: 18 },
  tile: { width: 150, padding: 16, borderRadius: 18, borderWidth: 1, gap: 6 },
  tileT: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIc: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tileL: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  tileN: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  lh: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  cnt: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 1 },
  cntTxt: { fontSize: 12.5, fontWeight: '700' },
  banner: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowT: { fontSize: 15, fontWeight: '700' },
  rowS: { fontSize: 13, flexShrink: 1 },
  more2: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  more: { paddingVertical: 8, marginBottom: 6 },
  moreTxt: { fontSize: 14, fontWeight: '700' },
  level: { marginTop: 8, marginBottom: 16 },
  proj: { padding: 20, marginBottom: 16 },
  quiet: { textAlign: 'center', paddingVertical: 10 },
  pj: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  logo: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoTxt: { fontSize: 12, fontWeight: '800' },
  nm: { flex: 1, minWidth: 0 },
  nmTxt: { fontSize: 14.5, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  pct: { fontSize: 13, fontWeight: '800', width: 46, textAlign: 'right' },
  disc: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  discN: { flex: 1, fontSize: 14, fontWeight: '700' },
  discC: { fontSize: 13, fontWeight: '600' },
})
