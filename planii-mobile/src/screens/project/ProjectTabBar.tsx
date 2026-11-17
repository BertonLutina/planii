import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ic } from '@/components/ui'
import { t } from '@/lib/i18n'
import { usePv } from '@/theme/ThemeProvider'

export type ProjectTab = 'tasks' | 'meet' | 'team' | 'appts' | 'polls' | 'activity'

/** Barre d'onglets fixe en bas (`.pv-mtab`) : quatre onglets + « Plus » (réunion, sondages). */
export function ProjectTabBar({ value, onChange, onMore }: {
  value: ProjectTab
  onChange: (t: ProjectTab) => void
  onMore: () => void
}) {
  const pv = usePv()
  const insets = useSafeAreaInsets()
  const items: [ProjectTab, string, string][] = [
    ['tasks', 'list', t('ad.tasks')],
    ['appts', 'calendar', t('pv.tabAppt')],
    ['team', 'users', t('pd.tabTeam')],
    ['activity', 'activity', t('pd.tabActivity')],
  ]
  const moreOn = value === 'meet' || value === 'polls'
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('pv.projectNav')}
      style={[s.bar, { backgroundColor: pv.surface, borderTopColor: pv.line, paddingBottom: 14 + insets.bottom }]}
    >
      {items.map(([k, ic, label]) => {
        const on = value === k
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
            style={s.item}
          >
            <Ic name={ic} s={24} c={on ? pv.accFg : pv.hint} />
            <Text style={[s.lbl, { color: on ? pv.accFg : pv.hint }]}>{label}</Text>
          </Pressable>
        )
      })}
      <Pressable
        onPress={onMore}
        accessibilityRole="tab"
        accessibilityState={{ selected: moreOn }}
        accessibilityLabel={t('pv.more')}
        style={s.item}
      >
        <Ic name="menu" s={24} c={moreOn ? pv.accFg : pv.hint} />
        <Text style={[s.lbl, { color: moreOn ? pv.accFg : pv.hint }]}>{t('pv.more')}</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 8, borderTopWidth: 1 },
  item: { alignItems: 'center', gap: 4, minWidth: 56, paddingHorizontal: 6, paddingVertical: 2 },
  lbl: { fontSize: 11.5, fontWeight: '700' },
})
