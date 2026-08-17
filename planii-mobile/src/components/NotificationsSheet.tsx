import { useCallback } from 'react'
import { Dimensions, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Banner, Button, EmptyState, Ic, Sheet, SkeletonList, type IconName } from '@/components/ui'
import { getLang, t, useI18n } from '@/lib/i18n'
import type { Notification } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Panneau des notifications — portage de la `Modal` de
   `planii-vite/src/components/Notifications.tsx`.
   Sur mobile c'est une feuille : liste virtualisée, non-lues distinguées par un
   point ET une graisse (jamais la couleur seule), suppression par ligne, et
   « tout marquer comme lu » explicite en pied — l'ouverture ne marque plus tout
   comme lu au passage, sinon le nouveau devient invisible au moment même où on
   vient le lire. */

const ICON: Record<string, IconName> = {
  project_deleted: 'trash',
  project_updated: 'edit',
  task_created: 'plus',
  invite_created: 'user-plus',
  project_joined: 'users',
}

const fmtAt = (s: string): string => {
  try {
    return new Date(s).toLocaleString(getLang(), {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

export interface NotificationsSheetProps {
  open: boolean
  onClose: () => void
  /** `null` pendant le premier chargement. */
  items: Notification[] | null
  /** Message d'erreur du dernier chargement, s'il y en a un. */
  error?: string | null
  /** Nombre de non-lues — pilote le bouton « tout marquer comme lu ». */
  unread: number
  onMarkAllRead: () => void
  onDelete: (id: string) => void
  onRefresh: () => void
  refreshing?: boolean
}

export function NotificationsSheet({
  open, onClose, items, error, unread, onMarkAllRead, onDelete, onRefresh, refreshing = false,
}: NotificationsSheetProps) {
  const { c } = useTheme()
  useI18n()

  const renderItem = useCallback(({ item }: { item: Notification }) => (
    <Row n={item} onDelete={onDelete} />
  ), [onDelete])

  /* La feuille se dimensionne sur son contenu : la liste doit être bornée pour
     défiler au lieu de déborder. */
  const maxHeight = Math.round(Dimensions.get('window').height * 0.52)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('notif.title')}
      scrollable={false}
      contentStyle={s.body}
      actions={unread > 0 ? (
        /* Pas de clé i18n pour cette action côté web (l'ouverture y marquait
           tout lu automatiquement) — copie française écrite ici, comme le fait
           déjà `ThemeControl`. */
        <Button label="Tout marquer comme lu" icon="check" variant="secondary" block onPress={onMarkAllRead} />
      ) : undefined}
    >
      {!!error && <Banner tone="danger" icon="alert" text={error} style={s.banner} />}

      {items === null ? (
        <SkeletonList count={4} itemHeight={72} style={s.skel} />
      ) : items.length === 0 ? (
        <EmptyState icon="bell" title={t('notif.empty')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          style={{ maxHeight }}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: c.line }]} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </Sheet>
  )
}

function Row({ n, onDelete }: { n: Notification; onDelete: (id: string) => void }) {
  const { c } = useTheme()
  const at = fmtAt(n.at)
  return (
    <View
      accessible
      accessibilityLabel={`${n.read ? '' : 'Non lue — '}${n.title}. ${n.detail}. ${at}`}
      style={[s.row, !n.read && { backgroundColor: c.accentBg }]}
    >
      <View style={[s.ico, { backgroundColor: n.read ? c.surface2 : c.surface }]}>
        <Ic name={ICON[n.type] || 'bell'} s={16} c={c.accent} />
      </View>

      <View style={s.main}>
        <View style={s.titleRow}>
          {!n.read && <View style={[s.dot, { backgroundColor: c.accent }]} />}
          <Text numberOfLines={2} style={[s.title, { color: c.text, fontWeight: n.read ? '600' : '800' }]}>
            {n.title}
          </Text>
        </View>
        {!!n.detail && <Text numberOfLines={3} style={[s.detail, { color: c.muted }]}>{n.detail}</Text>}
        {!!at && <Text style={[s.at, { color: c.hint }]}>{at}</Text>}
      </View>

      <Pressable
        onPress={() => onDelete(n.id)}
        accessibilityRole="button"
        accessibilityLabel={`${t('notif.clear')} — ${n.title}`}
        hitSlop={10}
        style={({ pressed }) => [s.del, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}
      >
        <Ic name="x" s={16} c={c.muted} strokeWidth={2.1} />
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  body: { paddingHorizontal: 0, paddingTop: 6 },
  banner: { marginHorizontal: 18 },
  skel: { paddingHorizontal: 18, paddingTop: 6 },
  list: { paddingBottom: 6 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingVertical: 12 },
  ico: { width: 32, height: 32, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  title: { flex: 1, fontSize: 14.5, lineHeight: 20 },
  detail: { fontSize: 13, lineHeight: 18 },
  at: { fontSize: 11.5, marginTop: 1 },
  del: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
})
