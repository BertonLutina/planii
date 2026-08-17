import { StyleSheet, Text } from 'react-native'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from './Button'
import { Sheet } from './Sheet'

export interface ConfirmProps {
  open: boolean
  onClose: () => void
  /** Question posée — « Supprimer le projet ? ». */
  title: string
  /** Ce qui va réellement se passer, en une ou deux phrases. */
  message?: string
  /** Défaut : « Confirmer ». Dites l'acte : « Oui, supprimer ». */
  confirmLabel?: string
  /** Défaut : « Annuler ». */
  cancelLabel?: string
  onConfirm: () => void
  /** `danger` (défaut) pour une suppression, `accent` pour une action neutre. */
  tone?: 'danger' | 'accent'
  loading?: boolean
}

/** Confirmation d'une action irréversible. À réserver aux actions qu'on ne peut
 *  pas défaire — jamais de « êtes-vous sûr ? » sur un geste réversible. */
export function Confirm({
  open, onClose, title, message, confirmLabel, cancelLabel,
  onConfirm, tone = 'danger', loading = false,
}: ConfirmProps) {
  const { c } = useTheme()
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button
            label={confirmLabel ?? t('action.confirm')}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            onPress={onConfirm}
            style={s.grow}
          />
          <Button label={cancelLabel ?? t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />
        </>
      }
    >
      {!!message && <Text style={[s.msg, { color: c.muted }]}>{message}</Text>}
    </Sheet>
  )
}

const s = StyleSheet.create({
  msg: { fontSize: 14.5, lineHeight: 21, paddingBottom: 6 },
  grow: { flex: 1 },
})
