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

/** Contrôle segmenté (`.tabs`) : piste sur `surface2`, segment actif sur
 *  `surface` avec ombre — lisible dans les deux thèmes. */
export function Tabs<K extends string>({ items, value, onChange, scrollable = false, style }: TabsProps<K>) {
  const { c } = useTheme()

  const segments = items.map((it) => {
    const on = it.key === value
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
          /* Sur fond sombre, `surface` est plus foncé que la piste `surface2` et
             l'ombre ne se voit pas : un filet garde le segment actif lisible. */
          on && [shadow, { backgroundColor: c.surface, borderColor: c.lineStrong, borderWidth: 1, shadowColor: c.shadowColor }],
        ]}
      >
        {!!it.icon && <Ic name={it.icon} s={15} c={on ? c.text : c.muted} />}
        <Text numberOfLines={1} style={[s.label, { color: on ? c.text : c.muted }]}>{it.label}</Text>
      </Pressable>
    )
  })

  const track: StyleProp<ViewStyle> = [s.track, { backgroundColor: c.surface2 }, style]

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={track} accessibilityRole="tablist">
        {segments}
      </ScrollView>
    )
  }
  return <View accessibilityRole="tablist" style={track}>{segments}</View>
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: radius.control },
  seg: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 38, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 9,
    /* Bordure toujours présente (transparente au repos) : la géométrie ne bouge
       pas quand le segment devient actif. */
    borderWidth: 1, borderColor: 'transparent',
  },
  segFlex: { flex: 1 },
  segAuto: { flex: 0 },
  label: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
})
