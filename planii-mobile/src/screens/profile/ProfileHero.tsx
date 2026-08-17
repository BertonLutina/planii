import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Avatar, Banner, Button, Card, toast, toastErr } from '@/components/ui'
import { Ic } from '@/components/Icon'
import { api, apiUpload, mediaUrl } from '@/lib/api'
import { t } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import type { User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'

/* Identité — portage du bloc `.profile-hero` (planii-vite/src/App.tsx).
   Le `<input type="file">` du web devient la photothèque de l'appareil ; la
   permission est demandée au moment du geste, jamais au démarrage. */

export function ProfileHero({ me }: { me: User }) {
  const { c } = useTheme()
  const { update } = useSession()
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  async function pick() {
    if (busy) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setDenied(true); return }
    setDenied(false)

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    const asset = res.canceled ? null : res.assets[0]
    if (!asset) return

    setBusy(true)
    try {
      const r = await apiUpload<{ user: User }>('/me/avatar', {
        uri: asset.uri,
        name: asset.fileName ?? 'avatar.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      })
      update(r.user)
      toast(t('profile.photoOk'))
    } catch (e) {
      toastErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy || !me.avatarUrl) return
    setBusy(true)
    try {
      const r = await api<{ user: User }>('DELETE', '/me/avatar')
      update(r.user)
      toast(t('profile.photoRemoved'))
    } catch (e) {
      toastErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <View style={s.who}>
        <Pressable
          onPress={pick}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePhoto')}
          accessibilityState={{ disabled: busy, busy }}
          style={s.avatarWrap}
        >
          <Avatar name={me.name} size={64} src={mediaUrl(me.avatarUrl)} />
          <View style={[s.badge, { backgroundColor: c.accent, borderColor: c.surface }]}>
            <Ic name="camera" s={13} c={c.onAccent} strokeWidth={2.1} />
          </View>
        </Pressable>

        <View style={s.identity}>
          <Text numberOfLines={2} style={[s.name, { color: c.text }]}>{me.name}</Text>
          <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>{me.email}</Text>
          {!!me.job && <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>{me.job}</Text>}
        </View>
      </View>

      <View style={s.actions}>
        <Button
          label={t('profile.changePhoto')}
          icon="image"
          size="sm"
          loading={busy}
          onPress={pick}
          style={s.grow}
        />
        {!!me.avatarUrl && (
          <Button
            label={t('profile.removePhoto')}
            icon="trash"
            size="sm"
            variant="ghost"
            disabled={busy}
            onPress={remove}
            style={s.grow}
          />
        )}
      </View>

      {denied && (
        <Banner tone="warn" icon="lock" style={s.denied}>
          <Text style={[s.deniedTxt, { color: c.warn }]}>
            Planii n’a pas accès à tes photos. Autorise-le dans les réglages pour choisir une image.
          </Text>
          <Button
            label="Ouvrir les réglages"
            size="sm"
            variant="ghost"
            onPress={() => { Linking.openSettings().catch(() => { /* réglages indisponibles */ }) }}
            style={s.deniedBtn}
          />
        </Banner>
      )}
    </Card>
  )
}

const s = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { width: 64, height: 64 },
  badge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  identity: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  grow: { flex: 1 },
  denied: { marginTop: 12 },
  deniedTxt: { fontSize: 13, lineHeight: 18.5, fontWeight: '600' },
  deniedBtn: { marginTop: 10, alignSelf: 'flex-start' },
})
