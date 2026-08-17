import { useEffect, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Avatar, Button, EmptyState, Sheet } from '@/components/ui'
import { ROLE_LABEL } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import type { Project, Task, User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { CheckRow } from '../controls/CheckRow'

/* Transfert d'une tâche — portage de `TransferTaskModal`.
   Le web déclenche le transfert au premier appui sur une personne ; ici on
   choisit d'abord (case cochée), puis on confirme : sur un écran tactile un
   appui de trop enverrait la tâche à la mauvaise personne, et le transfert
   déclenche un e-mail. */

export interface TransferSheetProps {
  open: boolean
  onClose: () => void
  p: Project
  task: Task | null
  me: User
  busy?: boolean
  /** Le parent exécute le PATCH (statusKey `transferred` + `transferredTo`). */
  onTransfer: (userId: string) => void
}

export function TransferSheet({ open, onClose, p, task, me, busy = false, onTransfer }: TransferSheetProps) {
  const { c } = useTheme()
  useI18n()
  const [sel, setSel] = useState<string>('')

  useEffect(() => { if (open) setSel('') }, [open, task?.id])

  const current = task?.assigneeId || me.id
  const targets = p.members.filter((m) => m.id !== current)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('pd.mTransfer')}
      actions={targets.length === 0 ? undefined : (
        <>
          <Button
            label={t('pd.transferBtn')}
            variant="primary"
            disabled={!sel}
            loading={busy}
            onPress={() => sel && onTransfer(sel)}
            style={s.grow}
          />
          <Button label={t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />
        </>
      )}
    >
      {targets.length === 0
        ? <EmptyState icon="users" title={t('pd.noTarget')} />
        : (
          <>
            <Text style={[s.intro, { color: c.muted }]}>
              {t('pd.pickTransfer', { n: task?.title ?? '' })}
            </Text>
            {targets.map((m) => (
              <CheckRow
                key={m.id}
                mode="radio"
                label={m.id === me.id ? `${m.name} ${t('vw.me')}` : m.name}
                sub={ROLE_LABEL[m.role] || m.role}
                left={<Avatar name={m.name} size={32} />}
                checked={sel === m.id}
                onPress={() => setSel(m.id)}
              />
            ))}
          </>
        )}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
})
