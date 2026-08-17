import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ic, PriorityFlag, priorityColors } from '@/components/ui'
import { formatDue, isOverdue } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { taskPoints } from '@/lib/points'
import { prioMeta } from '@/lib/priority'
import type { Task } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Une de mes tâches sur l'accueil — portage de `.home-task` / `.board-task`.
   Le glisser-déposer du web (appui long puis dépôt sur une colonne de statut)
   n'a pas d'équivalent fiable au doigt : le bouton « … » ouvre la même liste
   de statuts, atteignable au lecteur d'écran et sans risque de faux geste. */

export interface HomeTaskRowProps {
  task: Task
  /** Nom du projet — masqué en vue « tableau », où la colonne le porte déjà. */
  projectName?: string
  onOpen: () => void
  onToggle: () => void
  onMenu: () => void
}

function HomeTaskRowBase({ task: x, projectName, onOpen, onToggle, onMenu }: HomeTaskRowProps) {
  const { c } = useTheme()
  const pm = prioMeta(x.priority)
  const pc = priorityColors(c, pm.n)
  const over = isOverdue(x)
  const hasHours = x.spentHours != null || x.estHours != null
  const ring = x.done ? c.ok : pc.fg

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={x.title}
      accessibilityHint={t('td.openProject')}
      style={({ pressed }) => [
        s.row,
        {
          backgroundColor: pressed ? c.surface2 : c.surface,
          borderColor: over ? c.danger : c.line,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityLabel={x.done ? t('home.reopen') : t('home.finish')}
        accessibilityState={{ checked: x.done }}
        style={[s.check, { borderColor: ring, backgroundColor: x.done ? c.ok : 'transparent' }]}
      >
        {x.done ? <Ic name="check" s={13} c={c.onAccent} strokeWidth={2.8} /> : null}
      </Pressable>

      <View style={s.body}>
        {pm.n < 6 && <PriorityFlag priority={pm.n} style={s.flag} />}
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
        <View style={s.meta}>
          {!!projectName && (
            <View style={[s.chip, { backgroundColor: c.surface2 }]}>
              <Text numberOfLines={1} style={[s.chipTxt, { color: c.muted }]}>{projectName}</Text>
            </View>
          )}
          {!!x.due && (
            <View style={s.metaItem}>
              <Ic name="calendar" s={12} c={over ? c.danger : c.muted} />
              <Text style={[s.metaTxt, { color: over ? c.danger : c.muted }]}>{formatDue(x.due)}</Text>
            </View>
          )}
          {hasHours && (
            <View style={s.metaItem}>
              <Ic name="clock" s={12} c={c.muted} />
              <Text style={[s.metaTxt, { color: c.muted }]}>
                {x.spentHours != null ? x.spentHours : 0}h{x.estHours != null ? ` / ~${x.estHours}h` : ''}
              </Text>
            </View>
          )}
          {x.done && (
            <View style={s.metaItem}>
              <Ic name="star" s={12} c={c.gold} />
              <Text style={[s.metaTxt, { color: c.muted }]}>+{taskPoints(x)} pts</Text>
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={onMenu}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`${t('pd.actions')} — ${x.title}`}
        style={s.menu}
      >
        <Ic name="more-vertical" s={18} c={c.muted} />
      </Pressable>
    </Pressable>
  )
}

export const HomeTaskRow = memo(HomeTaskRowBase)

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: radius.card, padding: 12,
  },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flex: 0,
  },
  body: { flex: 1, minWidth: 0 },
  flag: { marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  desc: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 7 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, fontWeight: '600' },
  chip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill, maxWidth: 160 },
  chipTxt: { fontSize: 11.5, fontWeight: '700' },
  menu: { width: 30, minHeight: 30, alignItems: 'center', justifyContent: 'center', flex: 0 },
})
