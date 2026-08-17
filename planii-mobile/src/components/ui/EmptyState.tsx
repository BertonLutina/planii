import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic, type IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from './Button'

export interface EmptyStateProps {
  /** Icône du vide (défaut : `inbox`). */
  icon?: IconName | (string & {})
  /** Titre court. */
  title: string
  /** Une ligne qui explique pourquoi c'est vide. */
  message?: string
  /** Action qui remplit l'écran — le libellé dit ce qu'elle fait. */
  actionLabel?: string
  onAction?: () => void
  style?: StyleProp<ViewStyle>
}

/** État vide : une icône, une explication d'une ligne, et l'action qui le remplit. */
export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const { c } = useTheme()
  return (
    <View style={[s.box, style]}>
      <View style={[s.ico, { backgroundColor: c.surface2 }]}>
        <Ic name={icon} s={26} c={c.hint} />
      </View>
      <Text style={[s.title, { color: c.text }]}>{title}</Text>
      {!!message && <Text style={[s.msg, { color: c.muted }]}>{message}</Text>}
      {!!actionLabel && !!onAction && (
        <Button label={actionLabel} variant="primary" onPress={onAction} style={s.btn} />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 18 },
  ico: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  msg: { fontSize: 13.5, marginTop: 5, textAlign: 'center', lineHeight: 19, maxWidth: 320 },
  btn: { marginTop: 16 },
})
