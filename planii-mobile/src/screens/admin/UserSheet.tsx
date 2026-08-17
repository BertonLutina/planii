import { StyleSheet, Text, View } from 'react-native'
import { Avatar, Button, Pill, Sheet } from '@/components/ui'
import { t } from '@/lib/i18n'
import { levelOf } from '@/lib/points'
import { useTheme } from '@/theme/ThemeProvider'
import { Kv } from './AdminParts'
import { fmtAgo, fmtDate } from './format'
import type { AUser } from './types'

/* Fiche d'un utilisateur. Le web étale huit métadonnées sur la ligne du
   tableau ; à 320 pt elles tiendraient sur quatre lignes et écraseraient le
   nom. La carte de la liste ne garde donc que ce qu'on cherche du regard —
   identité, rôle, points — et tout le reste vit ici.

   Les deux actions conséquentes (rôle admin, suppression) sont posées au bas
   de la fiche : elles se lisent après les chiffres qui les justifient. Chacune
   ferme la feuille puis ouvre sa confirmation — jamais deux feuilles
   superposées. */

export interface UserSheetProps {
  open: boolean
  user: AUser | null
  onClose: () => void
  /** L'appelant peut retirer/donner le rôle admin (super-admin seulement). */
  canToggleAdmin: boolean
  canDelete: boolean
  onToggleAdmin: () => void
  onDelete: () => void
}

export function UserSheet({
  open, user, onClose, canToggleAdmin, canDelete, onToggleAdmin, onDelete,
}: UserSheetProps) {
  const { c } = useTheme()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={user?.name ?? t('ad.users')}
      actions={<Button label={t('action.close')} variant="ghost" block onPress={onClose} style={s.grow} />}
    >
      {!!user && (
        <>
          <View style={s.head}>
            <Avatar name={user.name} size={52} />
            <View style={s.headBody}>
              <Text numberOfLines={2} style={[s.name, { color: c.text }]}>{user.name}</Text>
              <Text numberOfLines={2} style={[s.mail, { color: c.muted }]}>{user.email}</Text>
              {(user.superAdmin || user.admin) && (
                <Pill label={user.superAdmin ? t('ad.superAdmin') : t('ad.admin')} tone="accent" style={s.pill} />
              )}
            </View>
          </View>

          <Kv label={t('nav.projects')} value={String(user.projectCount)} />
          <Kv
            label={t('ad.tasks')}
            value={`${user.tasksOpen} ${t('home.colTodo')} · ${user.tasksDone} ${t('ad.done').toLowerCase()}`}
          />
          <Kv label={t('lb.level')} value={`${levelOf(user.points).level} · ${user.points} pts`} />
          <Kv label={t('ad.seen')} value={fmtAgo(user.lastLogin)} />
          <Kv label={t('ad.registered')} value={fmtDate(user.createdAt)} last />

          {(canToggleAdmin || canDelete) && (
            <View style={s.acts}>
              {canToggleAdmin && (
                <Button
                  label={user.admin ? t('ad.revokeAdmin') : t('ad.makeAdmin')}
                  icon="shield"
                  block
                  onPress={onToggleAdmin}
                />
              )}
              {canDelete && (
                <Button label={t('action.delete')} icon="trash" variant="danger" block onPress={onDelete} />
              )}
            </View>
          )}
        </>
      )}
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  headBody: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  mail: { fontSize: 13.5 },
  pill: { marginTop: 4 },
  acts: { gap: 10, marginTop: 18 },
})
