import { StyleSheet, Text } from 'react-native'
import { Avatar, Button, Sheet } from '@/components/ui'
import { ROLE_LABEL } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import type { Project } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { CheckRow } from '../controls/CheckRow'

/* Délégués de la réunion — `PUT /projects/:id/meeting/task-delegates`.
   Le web affiche cette liste en permanence dans le panneau latéral ; sur
   téléphone elle n'intéresse que le responsable et seulement au moment où il
   la change : une feuille ouverte depuis l'onglet suffit. */

export interface DelegatesSheetProps {
  open: boolean
  onClose: () => void
  p: Project
  value: string[]
  /** Enregistrement immédiat, comme sur le web (une case = une requête). */
  onChange: (next: string[]) => void
}

export function DelegatesSheet({ open, onClose, p, value, onChange }: DelegatesSheetProps) {
  const { c } = useTheme()
  useI18n()

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('meet.allowed')}
      actions={<Button label={t('action.close')} variant="ghost" onPress={onClose} style={s.grow} />}
    >
      <Text style={[s.intro, { color: c.muted }]}>{t('meet.allowedDesc')}</Text>
      {p.members.map((m) => (
        <CheckRow
          key={m.id}
          label={m.name}
          sub={ROLE_LABEL[m.role] || m.role}
          left={<Avatar name={m.name} size={32} />}
          checked={value.includes(m.id)}
          onPress={() => toggle(m.id)}
        />
      ))}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
})
