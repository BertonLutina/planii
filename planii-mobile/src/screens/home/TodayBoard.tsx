import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Banner, Ic, PriorityFlag, Skeleton, toneColors, type Tone } from '@/components/ui'
import { DOW, MONTHS, formatDue } from '@/lib/dates'
import { t } from '@/lib/i18n'
import type { TodayPayload, TodayTask } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Tableau du jour — portage de `TodayDashboard` (planii-vite/src/components/Home.tsx).
 *
 * Le web pose six tuiles côte à côte, chacune listant jusqu'à cinq tâches :
 * en colonne unique cela donne un mur de trente lignes avant d'atteindre la
 * liste « à faire ». Ici les six tuiles restent des tuiles — deux par rangée,
 * lisibles à 320 px — et se **déplient** sur place pour montrer leur contenu.
 * Un seul volet ouvert à la fois : rien n'est empilé, rien n'est modal, et le
 * coup d'œil promis par le guide (« Un coup d'œil suffit ») reste vrai.
 */

type SectionKey = keyof TodayPayload

interface SectionDef {
  key: SectionKey
  title: string
  tone: Tone
  icon: string
  empty: string
}

const SECTIONS = (): SectionDef[] => ([
  { key: 'overdue', title: t('today.overdue'), tone: 'danger', icon: 'clock-late', empty: t('today.noOverdue') },
  { key: 'dueToday', title: t('today.dueToday'), tone: 'accent', icon: 'calendar', empty: t('today.noDueToday') },
  { key: 'highPriority', title: t('today.highPrio'), tone: 'warn', icon: 'flame', empty: t('today.noHighPrio') },
  { key: 'transferred', title: t('today.transferred'), tone: 'blue', icon: 'transfer', empty: t('today.noTransferred') },
  { key: 'review', title: t('today.review'), tone: 'ok', icon: 'eye', empty: t('today.noReview') },
  { key: 'activeDiscussions', title: t('today.discussions'), tone: 'neutral', icon: 'message', empty: t('today.noMeeting') },
])

/** Le web affiche au plus cinq entrées par tuile — même plafond ici. */
const MAX_ROWS = 5

export interface TodayBoardProps {
  /** `null` tant que `GET /today` n'a pas répondu. */
  today: TodayPayload | null
  error?: string | null
  /** Ouvre le projet porteur de la tâche / de la discussion. */
  onOpen: (projectId: string) => void
  style?: StyleProp<ViewStyle>
}

export function TodayBoard({ today, error, onOpen, style }: TodayBoardProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState<SectionKey | null>(null)
  const defs = useMemo(() => SECTIONS(), [])

  const now = new Date()
  const dateLabel = `${DOW[(now.getDay() + 6) % 7]} ${now.getDate()} ${MONTHS[now.getMonth()]}`

  const total = today
    ? defs.reduce((sum, d) => sum + (d.key === 'activeDiscussions' ? 0 : (today[d.key] as TodayTask[]).length), 0)
    : 0

  const openDef = open ? defs.find((d) => d.key === open) ?? null : null

  return (
    <View style={style}>
      <View style={s.head}>
        <View style={s.headTxt}>
          <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>{t('today.title')}</Text>
          <Text style={[s.sub, { color: c.muted }]}>
            {!today ? t('today.loading') : total ? t('today.watch', { n: total }) : t('today.calm')}
          </Text>
        </View>
        <View style={[s.datePill, { backgroundColor: c.surface2 }]}>
          <Text numberOfLines={1} style={[s.dateTxt, { color: c.muted }]}>{dateLabel}</Text>
        </View>
      </View>

      {!!error && !today && <Banner tone="danger" icon="alert" text={error} style={s.banner} />}

      <View style={s.grid}>
        {defs.map((d) => {
          if (!today) return <TileSkeleton key={d.key} />
          const count = d.key === 'activeDiscussions'
            ? today.activeDiscussions.length
            : (today[d.key] as TodayTask[]).length
          const foot = count === 0
            ? d.empty
            : d.key === 'activeDiscussions'
              ? today.activeDiscussions[0].projectName
              : (today[d.key] as TodayTask[])[0].title
          return (
            <Tile
              key={d.key}
              def={d}
              count={count}
              foot={foot}
              open={open === d.key}
              onPress={() => setOpen((k) => (k === d.key ? null : d.key))}
            />
          )
        })}
      </View>

      {!!today && !!openDef && (
        <View style={[s.panel, { backgroundColor: c.surface, borderColor: c.line }]}>
          <View style={s.panelHead}>
            <Ic name={openDef.icon} s={16} c={toneColors(c, openDef.tone).fg} />
            <Text numberOfLines={1} style={[s.panelTitle, { color: c.text }]}>{openDef.title}</Text>
          </View>
          <PanelBody def={openDef} today={today} onOpen={onOpen} />
        </View>
      )}
    </View>
  )
}

/* ── Tuile ────────────────────────────────────────────────────────────── */

function Tile({ def, count, foot, open, onPress }: {
  def: SectionDef
  count: number
  foot: string
  open: boolean
  onPress: () => void
}) {
  const { c } = useTheme()
  const tone = toneColors(c, def.tone)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${def.title} — ${count}`}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [
        s.tile,
        {
          backgroundColor: open ? tone.bg : pressed ? c.surface2 : c.surface,
          borderColor: open ? tone.border : c.line,
          borderWidth: open ? 1.5 : 1,
        },
      ]}
    >
      <View style={s.tileTop}>
        <Ic name={def.icon} s={15} c={tone.fg} />
        <Text numberOfLines={1} style={[s.tileLabel, { color: tone.fg }]}>{def.title}</Text>
        <Ic name={open ? 'chevron-up' : 'chevron-down'} s={15} c={c.muted} />
      </View>
      <Text style={[s.tileCount, { color: c.text }]}>{count}</Text>
      <Text numberOfLines={2} style={[s.tileFoot, { color: c.muted }]}>{foot}</Text>
    </Pressable>
  )
}

function TileSkeleton() {
  const { c } = useTheme()
  return (
    <View style={[s.tile, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Skeleton width="70%" height={12} />
      <Skeleton width={34} height={24} style={s.skelCount} />
      <Skeleton width="90%" height={11} style={s.skelFoot} />
    </View>
  )
}

/* ── Volet déplié ─────────────────────────────────────────────────────── */

function PanelBody({ def, today, onOpen }: { def: SectionDef; today: TodayPayload; onOpen: (id: string) => void }) {
  const { c } = useTheme()

  if (def.key === 'activeDiscussions') {
    const items = today.activeDiscussions
    if (items.length === 0) return <Text style={[s.emptyTxt, { color: c.muted }]}>{def.empty}</Text>
    return (
      <View>
        {items.slice(0, MAX_ROWS).map((d) => (
          <Pressable
            key={d.projectId}
            onPress={() => onOpen(d.projectId)}
            accessibilityRole="button"
            accessibilityLabel={`${d.projectName} — ${d.count} ${t('today.messages')}`}
            style={({ pressed }) => [s.row, { borderTopColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' }]}
          >
            <View style={s.rowBody}>
              <Text numberOfLines={1} style={[s.rowTitle, { color: c.text }]}>{d.projectName}</Text>
              <Text numberOfLines={1} style={[s.rowSub, { color: c.muted }]}>
                {d.count} {t('today.messages')}
              </Text>
            </View>
            <Ic name="chevron-right" s={17} c={c.muted} />
          </Pressable>
        ))}
        <More n={items.length - MAX_ROWS} />
      </View>
    )
  }

  const items = today[def.key] as TodayTask[]
  if (items.length === 0) return <Text style={[s.emptyTxt, { color: c.muted }]}>{def.empty}</Text>
  return (
    <View>
      {items.slice(0, MAX_ROWS).map((x) => (
        <Pressable
          key={def.key + x.id}
          onPress={() => onOpen(x.projectId)}
          accessibilityRole="button"
          accessibilityLabel={`${x.title} — ${x.projectName}`}
          accessibilityHint={t('td.openProject')}
          style={({ pressed }) => [s.row, { borderTopColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' }]}
        >
          <PriorityFlag priority={x.priority} style={s.rowFlag} />
          <View style={s.rowBody}>
            <Text numberOfLines={2} style={[s.rowTitle, { color: c.text }]}>{x.title}</Text>
            <Text numberOfLines={1} style={[s.rowSub, { color: c.muted }]}>
              {x.projectName}{x.due ? ' · ' + formatDue(x.due) : ''}
            </Text>
          </View>
          {x.statusKey === 'transferred' && <Ic name="transfer" s={16} c={c.blue} />}
          <Ic name="chevron-right" s={17} c={c.muted} />
        </Pressable>
      ))}
      <More n={items.length - MAX_ROWS} />
    </View>
  )
}

function More({ n }: { n: number }) {
  const { c } = useTheme()
  if (n <= 0) return null
  return <Text style={[s.more, { color: c.muted, borderTopColor: c.line }]}>+{n}</Text>
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  headTxt: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  datePill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, maxWidth: 132 },
  dateTxt: { fontSize: 11.5, fontWeight: '700', textTransform: 'capitalize' },
  banner: { marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48.5%', minHeight: 96, borderRadius: radius.card, padding: 12 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: { flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: '800' },
  tileCount: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  tileFoot: { fontSize: 11.5, lineHeight: 15, marginTop: 1 },
  skelCount: { marginTop: 8 },
  skelFoot: { marginTop: 8 },
  panel: { marginTop: 12, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 12 },
  panelTitle: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '800' },
  emptyTxt: { fontSize: 13, padding: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, paddingHorizontal: 12, minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth },
  rowFlag: { marginTop: 1 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  rowSub: { fontSize: 12, marginTop: 2 },
  more: { fontSize: 12, fontWeight: '700', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth },
})
