import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ic, type IconName } from '@/components/Icon'
import { useTheme } from '@/theme/ThemeProvider'
import { Sheet } from './Sheet'

export interface ActionItem {
  label: string
  icon?: IconName | (string & {})
  /** `danger` colore le libellé et l'icône en rouge. */
  tone?: 'default' | 'danger'
  disabled?: boolean
  onPress: () => void
}

export interface ActionMenuProps {
  open: boolean
  onClose: () => void
  /** Titre de la feuille (défaut : « Actions »). */
  title?: string
  items: ActionItem[]
  /** Ferme la feuille avant d'exécuter l'action (défaut : oui). */
  closeOnPress?: boolean
}

/** Menu d'actions (`.mact`) présenté dans une feuille : rangées de 15 pt de
 *  haut séparées par un filet, une seule action destructrice en fin de liste. */
export function ActionMenu({ open, onClose, title = 'Actions', items, closeOnPress = true }: ActionMenuProps) {
  const { c } = useTheme()
  return (
    <Sheet open={open} onClose={onClose} title={title} contentStyle={s.body}>
      {items.map((it, i) => {
        const fg = it.tone === 'danger' ? c.danger : c.text
        return (
          <Pressable
            key={`${it.label}-${i}`}
            disabled={it.disabled}
            onPress={() => { if (closeOnPress) onClose(); it.onPress() }}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            accessibilityState={{ disabled: !!it.disabled }}
            style={({ pressed }) => [
              s.row,
              {
                borderBottomColor: c.line,
                borderBottomWidth: i === items.length - 1 ? 0 : 1,
                backgroundColor: pressed ? c.surface2 : 'transparent',
                opacity: it.disabled ? 0.5 : 1,
              },
            ]}
          >
            <View style={s.ico}>{!!it.icon && <Ic name={it.icon} s={19} c={fg} />}</View>
            <Text numberOfLines={1} style={[s.label, { color: fg }]}>{it.label}</Text>
          </Pressable>
        )
      })}
    </Sheet>
  )
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 52, paddingVertical: 15, marginHorizontal: -4, paddingHorizontal: 4 },
  ico: { width: 22, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', flex: 1 },
})
