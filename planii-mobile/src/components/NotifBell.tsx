import { useState } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic } from '@/components/ui'
import { NotificationsSheet } from '@/components/NotificationsSheet'
import { t, useI18n } from '@/lib/i18n'
import { useNotifications } from '@/lib/notifications'
import { useTheme } from '@/theme/ThemeProvider'

/* Cloche de notifications — portage de `NotifBell`
   (planii-vite/src/components/Notifications.tsx).
   L'état vit dans `NotificationsProvider` : les cinq onglets partagent un seul
   chargement et un seul compteur. La cloche n'a plus qu'à l'afficher et à
   ouvrir sa feuille. La pastille porte le compte (jamais la couleur seule). */

export interface NotifBellProps {
  /** Rare : reprend la main sur l'appui (la feuille ne s'ouvre alors plus toute seule). */
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function NotifBell({ onPress, style }: NotifBellProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)
  const { items, unread, error, refreshing, refresh, markAllRead, remove } = useNotifications()
  useI18n()

  const badge = unread > 9 ? '9+' : String(unread)
  const label = unread > 0
    ? `${t('notif.title')} — ${unread} ${unread > 1 ? 'non lues' : 'non lue'}`
    : t('notif.title')

  return (
    <>
      <Pressable
        onPress={onPress ?? (() => setOpen(true))}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        style={({ pressed }) => [
          s.btn,
          { borderColor: c.line, backgroundColor: pressed ? c.surface2 : c.surface },
          style,
        ]}
      >
        <Ic name="bell" s={19} c={c.muted} />
        {unread > 0 && (
          <View style={[s.badge, { backgroundColor: c.accent, borderColor: c.surface }]}>
            <Text style={[s.badgeTxt, { color: c.onAccent }]}>{badge}</Text>
          </View>
        )}
      </Pressable>

      <NotificationsSheet
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        error={error}
        unread={unread}
        onMarkAllRead={markAllRead}
        onDelete={remove}
        onRefresh={refresh}
        refreshing={refreshing}
      />
    </>
  )
}

const s = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10,
    borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { fontSize: 10.5, fontWeight: '800', lineHeight: 13 },
})
