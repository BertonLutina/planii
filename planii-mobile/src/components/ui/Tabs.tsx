import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic, type IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, shadow } from '@/theme/tokens'

export interface TabItem<K extends string> {
  key: K
  label: string
  icon?: IconName | (string & {})
}

export interface TabsProps<K extends string> {
  items: TabItem<K>[]
  value: K
  onChange: (key: K) => void
  /** Fait défiler horizontalement au lieu de compresser (> 4 onglets). */
  scrollable?: boolean
  style?: StyleProp<ViewStyle>
}

/** Deux présentations, selon le nombre d'entrées.
 *  — 2 ou 3 choix (`scrollable` faux) : piste segmentée, comme sur le web.
 *  — davantage : rail de pastilles qui défile. Les pastilles ne rétrécissent
 *    jamais, sinon l'icône finit par recouvrir le libellé à 320 pt. */
export function Tabs<K extends string>({ items, value, onChange, scrollable = false, style }: TabsProps<K>) {
  const { c } = useTheme()

  const segments = items.map((it) => {
    const on = it.key === value
    const fg = on ? (scrollable ? c.accentOn : c.text) : c.muted
    return (
      <Pressable
        key={it.key}
        onPress={() => onChange(it.key)}
        accessibilityRole="tab"
        accessibilityLabel={it.label}
        accessibilityState={{ selected: on }}
        style={[
          s.seg,
          scrollable ? s.segAuto : s.segFlex,
          scrollable && !on && { backgroundColor: c.surface, borderColor: c.line },
          scrollable && on && { backgroundColor: c.accentBg, borderColor: c.accentBorder },
          /* Sur fond sombre, `surface` est plus foncé que la piste `surface2` et
             l'ombre ne se voit pas : un filet garde le segment actif lisible. */
          !scrollable && on && [shadow, { backgroundColor: c.surface, borderColor: c.lineStrong, borderWidth: 1, shadowColor: c.shadowColor }],
        ]}
      >
        {!!it.icon && (
          <View style={s.icon}>
            <Ic name={it.icon} s={15} c={fg} />
          </View>
        )}
        <Text numberOfLines={1} style={[s.label, scrollable && s.labelFixed, { color: fg }]}>{it.label}</Text>
      </Pressable>
    )
  })

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.rail, style]}
        accessibilityRole="tablist"
      >
        {segments}
      </ScrollView>
    )
  }

  const track: StyleProp<ViewStyle> = [s.track, { backgroundColor: c.surface2 }, style]
  return <View accessibilityRole="tablist" style={track}>{segments}</View>
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: radius.control },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  seg: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12,
    /* Bordure toujours présente (transparente au repos) : la géométrie ne bouge
       pas quand le segment devient actif. */
    borderWidth: 1, borderColor: 'transparent', overflow: 'hidden',
  },
  segFlex: { flex: 1, minWidth: 0 },
  /* Une pastille qui défile garde sa largeur naturelle : jamais de rétrécissement. */
  segAuto: { flexGrow: 0, flexShrink: 0 },
  icon: { flexGrow: 0, flexShrink: 0 },
  label: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  labelFixed: { flexShrink: 0 },
})
