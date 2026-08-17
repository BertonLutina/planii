import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button, EmptyState, Sheet } from '@/components/ui'
import { t, useI18n } from '@/lib/i18n'
import { typeTone } from '@/lib/tasktype'
import type { Member, ProjectRole } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { CheckRow } from '../controls/CheckRow'

/* Rôles d'un membre — portage de `AssignRoles`.
   `PUT /projects/:id/members/:userId/roles` avec la liste complète. */

export interface RolesSheetProps {
  open: boolean
  onClose: () => void
  member: Member | null
  roles: ProjectRole[]
  busy?: boolean
  onSave: (roleIds: string[]) => void
}

export function RolesSheet({ open, onClose, member, roles, busy = false, onSave }: RolesSheetProps) {
  const { c } = useTheme()
  useI18n()
  const [sel, setSel] = useState<string[]>([])

  useEffect(() => { if (open) setSel(member?.roleIds ?? []) }, [open, member])

  const toggle = (id: string) => setSel((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${t('pd.rolesOf')} ${member?.name ?? ''}`}
      actions={
        <>
          <Button label={t('action.save')} variant="primary" loading={busy} onPress={() => onSave(sel)} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" disabled={busy} onPress={onClose} style={s.grow} />
        </>
      }
    >
      {roles.length === 0
        ? <EmptyState icon="shield" title={t('pd.noRoles')} />
        : (
          <>
            <Text style={[s.intro, { color: c.muted }]}>{t('pd.pickRoles')}</Text>
            {roles.map((r) => (
              <CheckRow
                key={r.id}
                label={r.name}
                checked={sel.includes(r.id)}
                onPress={() => toggle(r.id)}
                /* La couleur du rôle est dérivée de son nom : pastille, pas de
                   texte sur fond teinté. */
                left={<View style={[s.dot, { backgroundColor: dotColor(c, r.name) }]} />}
              />
            ))}
          </>
        )}
    </Sheet>
  )
}

/** Pastille d'un rôle — même famille de tons que les puces de type. */
function dotColor(c: ReturnType<typeof useTheme>['c'], name: string): string {
  switch (typeTone(name)) {
    case 'tt-b': return c.blue
    case 'tt-c': return c.ok
    case 'tt-d': return c.warn
    case 'tt-e': return c.danger
    default: return c.accent
  }
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
})
