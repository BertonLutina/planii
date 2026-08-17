import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Ic, PriorityFlag, priorityColors } from '@/components/ui'
import { formatDue } from '@/lib/dates'
import { t, trTerm } from '@/lib/i18n'
import { prioMeta } from '@/lib/priority'
import { typeTone } from '@/lib/tasktype'
import type { Project, Task, TaskStatus, User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { taskPerms } from '../lib/perms'
import { findStatus, statusOf } from '../lib/statuses'
import { Tag } from './Tag'

export interface TaskRowProps {
  task: Task
  p: Project
  me: User
  statuses: TaskStatus[]
  /** Sous-tâche : rangée indentée sous son parent. */
  sub?: boolean
  subCount?: number
  subDone?: number
  collapsed?: boolean
  onToggleCollapse?: () => void
  onOpen: () => void
  onCheck: () => void
  onMenu: () => void
  onRemind: () => void
}

/** Une tâche. Les sous-tâches sont des rangées indentées sous leur parent, avec
 *  un rail vertical et un chevron de repli sur le parent — la hiérarchie reste
 *  lisible à 320 pt, ce qu'une colonne kanban ne permettrait pas. */
function TaskRowBase({
  task: x, p, me, statuses, sub = false, subCount = 0, subDone = 0,
  collapsed = false, onToggleCollapse, onOpen, onCheck, onMenu, onRemind,
}: TaskRowProps) {
  const { c } = useTheme()
  const perms = taskPerms(x, p, me, sub)
  const pm = prioMeta(x.priority)
  const pc = priorityColors(c, pm.n)
  const st = findStatus(statuses, statusOf(x))
  const nameOf = (id?: string | null) => (id ? (p.members.find((m) => m.id === id)?.name ?? '—') : '—')
  const hasHours = x.spentHours != null || x.estHours != null
  const hasMenu = perms.canEditMeta || perms.canLogHours || perms.canDel || perms.canPrio
    || perms.canTransfer || perms.canClaim || perms.canSub || perms.canMove

  const ringColor = x.done ? c.ok : perms.canCheck ? pc.fg : c.lineStrong

  return (
    <View style={[s.wrap, sub && s.subWrap, sub && { borderLeftColor: c.line }]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={x.title}
        accessibilityHint={t('td.openProject')}
        style={({ pressed }) => [
          s.row,
          { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: perms.over ? c.danger : c.line },
        ]}
      >
        <Pressable
          onPress={perms.canCheck ? onCheck : undefined}
          disabled={!perms.canCheck}
          hitSlop={12}
          accessibilityRole="checkbox"
          accessibilityLabel={t('home.check')}
          accessibilityState={{ checked: x.done, disabled: !perms.canCheck }}
          accessibilityHint={perms.closed ? t('pd.closedShort') : perms.canCheck ? undefined : t('pd.onlyOwner')}
          style={[s.check, { borderColor: ringColor, backgroundColor: x.done ? c.ok : 'transparent' }]}
        >
          {x.done
            ? <Ic name="check" s={13} c={c.onAccent} strokeWidth={2.8} />
            : !perms.canCheck ? <Ic name="lock" s={11} c={c.hint} /> : null}
        </Pressable>

        <View style={s.body}>
          <View style={s.titleLine}>
            {pm.n < 6 && <PriorityFlag priority={pm.n} />}
            {!!x.type && <Tag label={trTerm(x.type)} tone={typeTone(x.type)} />}
          </View>
          <Text
            numberOfLines={2}
            style={[
              s.title,
              { color: x.done ? c.muted : c.text, textDecorationLine: x.done ? 'line-through' : 'none' },
            ]}
          >
            {x.title}
          </Text>
          {!!x.description && (
            <Text numberOfLines={1} style={[s.desc, { color: c.muted }]}>{x.description}</Text>
          )}
          <View style={s.tags}>
            <Tag
              label={perms.unassigned ? t('vw.toTake') : (perms.assignee?.name ?? '—')}
              icon={perms.unassigned ? 'hand' : 'user'}
              tone={perms.unassigned ? 'warn' : 'neutral'}
            />
            {!!x.due && <Tag label={formatDue(x.due)} icon="calendar" tone={perms.over ? 'danger' : 'neutral'} />}
            {hasHours && (
              <Tag
                icon="clock"
                tone="neutral"
                label={`${x.spentHours != null ? x.spentHours : 0}h${x.estHours != null ? ` / ~${x.estHours}h` : ''}`}
              />
            )}
            {!!st && <Tag label={trTerm(st.label)} dot={st.color} tone="neutral" />}
            {x.transferable && <Tag label={t('pd.transferableTag')} icon="transfer" tone="accent" />}
            {!!x.commentCount && <Tag label={String(x.commentCount)} icon="message" tone="neutral" />}
            {subCount > 0 && <Tag label={`${subDone}/${subCount}`} icon="tasks" tone="neutral" />}
            {statusOf(x) === 'transferred' && (
              <Tag label={`${nameOf(x.transferredFrom)} → ${nameOf(x.transferredTo)}`} icon="transfer" tone="accent" />
            )}
          </View>
        </View>

        {subCount > 0 && !!onToggleCollapse && (
          <Pressable
            onPress={onToggleCollapse}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? t('action.expand') : t('action.collapse')}
            accessibilityState={{ expanded: !collapsed }}
            style={s.icoBtn}
          >
            <Ic name={collapsed ? 'chevron-right' : 'chevron-down'} s={18} c={c.muted} />
          </Pressable>
        )}
        {hasMenu && (
          <Pressable
            onPress={onMenu}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`${t('pd.actions')} — ${x.title}`}
            style={s.icoBtn}
          >
            <Ic name="more-vertical" s={18} c={c.muted} />
          </Pressable>
        )}
      </Pressable>

      {perms.canRelance && (
        <View style={[s.relance, { backgroundColor: c.dangerBg }]}>
          <Text numberOfLines={2} style={[s.relanceTxt, { color: c.dangerOn }]}>
            {t('pd.lateRemind', { n: perms.assignee?.name ?? '' })}
          </Text>
          <Button label={t('pd.remindBtn')} size="sm" onPress={onRemind} />
        </View>
      )}
    </View>
  )
}

export const TaskRow = memo(TaskRowBase)

const s = StyleSheet.create({
  wrap: { marginBottom: 8 },
  subWrap: { marginLeft: 16, paddingLeft: 10, borderLeftWidth: 2 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: radius.card, padding: 12,
  },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flex: 0,
  },
  body: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { fontSize: 15, fontWeight: '600', marginTop: 3, lineHeight: 20 },
  desc: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  icoBtn: { width: 30, minHeight: 30, alignItems: 'center', justifyContent: 'center', flex: 0 },
  relance: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 4, marginHorizontal: 8, padding: 10, borderRadius: radius.small,
  },
  relanceTxt: { flex: 1, fontSize: 12.5, fontWeight: '700' },
})
