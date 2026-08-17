import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { type as ty } from '@/theme/tokens'

export interface SectionHeaderProps {
  /** Intitulé de section, casse de phrase. */
  title: string
  /** Action à droite (« Modifier », « Tout voir »). */
  actionLabel?: string
  onAction?: () => void
  style?: StyleProp<ViewStyle>
}

/** En-tête de section (`.section-h`) : 13/600 en `muted`. */
export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  const { c } = useTheme()
  return (
    <View accessibilityRole="header" style={[s.section, style]}>
      <Text style={[s.sectionTxt, { color: c.muted }]}>{title}</Text>
      {!!actionLabel && !!onAction && (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={[s.action, { color: c.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

export interface GroupHeaderProps {
  /** Intitulé de groupe — affiché en capitales. */
  title: string
  /** Compteur affiché à droite du titre. */
  count?: number
  style?: StyleProp<ViewStyle>
}

/** En-tête de groupe (`.grp-h`) : 12/800, capitales, interlettrage 0.6. */
export function GroupHeader({ title, count, style }: GroupHeaderProps) {
  const { c } = useTheme()
  return (
    <View accessibilityRole="header" style={[s.group, style]}>
      <Text style={[s.groupTxt, { color: c.muted }]}>
        {title.toUpperCase()}{count === undefined ? '' : ` · ${count}`}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 18, marginBottom: 9 },
  sectionTxt: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  action: { fontSize: 13, fontWeight: '700' },
  group: { marginTop: 18, marginBottom: 10, paddingHorizontal: 2 },
  groupTxt: { fontSize: ty.groupHeader.fontSize, fontWeight: '800', letterSpacing: 0.6 },
})
