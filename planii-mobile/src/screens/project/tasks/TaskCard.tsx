import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ic } from '@/components/ui'
import { t, trTerm } from '@/lib/i18n'
import type { Project, Task, TaskStatus, User } from '@/lib/types'
import { usePv } from '@/theme/ThemeProvider'
import { taskPerms } from '../lib/perms'
import { findStatus, statusOf } from '../lib/statuses'
import { DueLabel, FileBadge, PrioChip, PvAvatar, StatusPill } from '../pv/PvBits'

export interface TaskCardProps {
  task: Task
  p: Project
  me: User
  statuses: TaskStatus[]
  /** Sous-tâche : carte décalée sous son parent. */
  sub?: boolean
  subCount?: number
  subDone?: number
  /** Les sous-tâches sont dépliées sous la carte. */
  open?: boolean
  onToggleSubs?: () => void
  onOpen: () => void
  onCheck: () => void
  onStatus: () => void
  onPrio: () => void
  onMenu: () => void
}

/** Carte de tâche du prototype mobile (`.pv-row` sous 900 px) :
 *  ligne 1 — case, pastille de statut, priorité, ⋯ ; ligne 2 — titre ; ligne 3 — échéance, trombone, avatar. */
function TaskCardBase({
  task: x, p, me, statuses, sub = false, subCount = 0, subDone = 0, open = false,
  onToggleSubs, onOpen, onCheck, onStatus, onPrio, onMenu,
}: TaskCardProps) {
  const pv = usePv()
  const perms = taskPerms(x, p, me, sub)
  const st = findStatus(statuses, statusOf(x))
  const files = x.attachmentCount || 0
  const hasMenu = perms.canEditMeta || perms.canLogHours || perms.canDel || perms.canPrio
    || perms.canTransfer || perms.canClaim || perms.canSub || perms.canMove || perms.canRelance

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={x.title}
      accessibilityHint={t('td.openProject')}
      style={[
        s.card,
        sub && s.sub,
        { backgroundColor: pv.raised, borderColor: pv.line },
      ]}
    >
      <View style={s.top}>
        <Pressable
          onPress={perms.canCheck ? onCheck : undefined}
          disabled={!perms.canCheck}
          hitSlop={12}
          accessibilityRole="checkbox"
          accessibilityLabel={t('home.check')}
          accessibilityState={{ checked: x.done, disabled: !perms.canCheck }}
          accessibilityHint={perms.closed ? t('pd.closedShort') : perms.canCheck ? undefined : t('pd.onlyOwner')}
          style={[
            s.box,
            { borderColor: x.done ? pv.ok : pv.line2, backgroundColor: x.done ? pv.ok : 'transparent', opacity: perms.canCheck ? 1 : 0.6 },
          ]}
        >
          {x.done && <Ic name="check" s={12} c="#fff" strokeWidth={3} />}
        </Pressable>
        {!!st && <StatusPill label={trTerm(st.label)} color={st.color} onPress={perms.canMove ? onStatus : undefined} />}
        <View style={s.grow} />
        <PrioChip priority={x.priority} onPress={perms.canPrio ? onPrio : undefined} />
        {hasMenu && (
          <Pressable
            onPress={onMenu}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${t('pd.actions')} — ${x.title}`}
            style={s.more}
          >
            <Ic name="more" s={18} c={pv.hint} />
          </Pressable>
        )}
      </View>

      <View style={s.ttl}>
        <Text
          numberOfLines={3}
          style={[
            s.title,
            x.done
              ? { color: pv.hint, fontWeight: '600', textDecorationLine: 'line-through' }
              : { color: pv.text },
          ]}
        >
          {x.title}
        </Text>
        <View style={s.small}>
          <Text style={[s.smallTxt, { color: pv.hint }]}>{x.type ? trTerm(x.type) : t('vw.none')}</Text>
          {!!x.commentCount && (
            <View style={s.chip}>
              <Ic name="message" s={15} c={pv.hint} />
              <Text style={[s.smallTxt, { color: pv.hint, fontWeight: '600' }]}>{x.commentCount}</Text>
            </View>
          )}
          {subCount > 0 && !!onToggleSubs && (
            <Pressable
              onPress={onToggleSubs}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={open ? t('action.collapse') : t('action.expand')}
              accessibilityState={{ expanded: open }}
              style={s.chip}
            >
              <Ic name="tasks" s={14} c={open ? pv.accFg : pv.hint} />
              <Text style={[s.smallTxt, { color: open ? pv.accFg : pv.hint, fontWeight: '600' }]}>{subDone}/{subCount}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={s.foot}>
        {x.due ? <DueLabel due={x.due} late={perms.over} /> : <Text style={{ color: pv.muted, fontSize: 14 }}>—</Text>}
        {files > 0 && <FileBadge n={files} />}
        <View style={s.grow} />
        {perms.assignee
          ? <PvAvatar name={perms.assignee.name} />
          : (
            <View style={s.none}>
              <Ic name="hand" s={16} c={pv.hint} />
              <Text style={{ color: pv.hint, fontSize: 14, fontWeight: '600' }}>{t('pd.toTakeCap')}</Text>
            </View>
          )}
      </View>
    </Pressable>
  )
}

export const TaskCard = memo(TaskCardBase)

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  sub: { marginLeft: 14, paddingVertical: 12, paddingHorizontal: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  box: { width: 18, height: 18, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  more: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  ttl: { gap: 2 },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  small: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' },
  smallTxt: { fontSize: 13, fontWeight: '500' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  none: { flexDirection: 'row', alignItems: 'center', gap: 7 },
})
