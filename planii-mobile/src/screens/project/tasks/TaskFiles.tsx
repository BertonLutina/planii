import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Banner, Button, EmptyState, Ic, SkeletonList } from '@/components/ui'
import { api, apiUpload, mediaUrl } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { TaskAttachment, TaskAttachmentList } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { errMsg } from '../lib/flow'

const fmtSize = (n: number) =>
  n < 1024 ? `${n} o` : n < 1048576 ? `${Math.round(n / 1024)} Ko` : `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} Mo`

const iconOf = (a: TaskAttachment) =>
  a.kind === 'image' ? 'image' : a.kind === 'pdf' || ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'rtf', 'txt', 'md', 'csv'].includes(a.ext) ? 'file-text' : 'file'

const stamp = (at: string) => new Date(at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

interface Picked { uri: string; name: string; mimeType?: string; size?: number }

/** Fichiers joints d'une tâche (PDF, Word, Excel, photos…). Les fichiers sont privés :
 *  on demande un lien signé de 5 min au serveur, puis le système ouvre le fichier
 *  (aperçu PDF / Office intégré à iOS et Android). */
export function TaskFiles({ taskId, closed }: { taskId: string; closed: boolean }) {
  const { c } = useTheme()
  const [data, setData] = useState<TaskAttachmentList | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)

  const load = useCallback(() => {
    setErr(null)
    api<TaskAttachmentList>('GET', '/tasks/' + taskId + '/attachments').then(setData).catch((e) => setErr(errMsg(e)))
  }, [taskId])
  useEffect(load, [load])

  async function send(files: Picked[]) {
    if (!data) return
    setErr(null)
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      if (!data.accept.includes(ext)) { setErr(t('files.badType', { n: f.name })); continue }
      if (f.size != null && f.size > data.maxFileBytes) { setErr(t('files.tooBig', { n: f.name, max: fmtSize(data.maxFileBytes) })); continue }
      setSending(f.name)
      try {
        const r = await apiUpload<{ attachment: TaskAttachment }>('/tasks/' + taskId + '/attachments', f)
        setData((d) => d && { ...d, attachments: [...d.attachments, r.attachment], usedBytes: d.usedBytes + (f.size ?? 0) })
      } catch (e) { setErr(`${f.name} : ${errMsg(e)}`) }
      finally { setSending(null) }
    }
  }

  async function pickDocument() {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true })
    if (res.canceled) return
    await send(res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size })))
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setErr(t('files.noPhotos')); return }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 })
    if (res.canceled) return
    await send(res.assets.map((a, i) => {
      // La photothèque peut renvoyer un nom sans extension : on en impose une acceptée par le serveur.
      const raw = a.fileName ?? `photo-${Date.now()}-${i}.jpg`
      return { uri: a.uri, name: /\.[a-z0-9]+$/i.test(raw) ? raw : raw + '.jpg', mimeType: a.mimeType ?? 'image/jpeg', size: a.fileSize }
    }))
  }

  async function open(a: TaskAttachment) {
    setErr(null)
    try {
      const r = await api<{ url: string }>('GET', `/attachments/${a.id}/link${a.previewable ? '' : '?download=1'}`)
      await Linking.openURL(mediaUrl(r.url)!)
    } catch (e) { setErr(errMsg(e)) }
  }

  function remove(a: TaskAttachment) {
    Alert.alert(t('files.confirmDel', { n: a.name }), t('files.confirmDelBody'), [
      { text: t('action.cancel'), style: 'cancel' },
      {
        text: t('action.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api('DELETE', '/attachments/' + a.id)
            setData((d) => d && { ...d, attachments: d.attachments.filter((x) => x.id !== a.id), usedBytes: Math.max(0, d.usedBytes - a.size) })
          } catch (e) { setErr(errMsg(e)) }
        },
      },
    ])
  }

  const full = !!data && data.usedBytes >= data.quotaBytes

  return (
    <View style={s.fill}>
      {!!err && <Banner text={err} tone="danger" icon="alert" style={s.err} />}
      {!data
        ? <SkeletonList count={3} itemHeight={56} style={s.pad} />
        : (
          <ScrollView style={s.fill} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {data.attachments.length === 0 && !sending && <EmptyState icon="paperclip" title={t('files.none')} />}
            {data.attachments.map((a) => (
              <View key={a.id} style={[s.row, { backgroundColor: c.surface, borderColor: c.line }]}>
                <Pressable
                  onPress={() => open(a)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('files.open')} — ${a.name}`}
                  style={s.rowMain}
                >
                  <View style={[s.ic, { backgroundColor: c.surface2 }]}><Ic name={iconOf(a)} s={20} c={c.muted} /></View>
                  <View style={s.meta}>
                    <Text numberOfLines={1} style={[s.name, { color: c.text }]}>{a.name}</Text>
                    <Text numberOfLines={1} style={[s.sub, { color: c.hint }]}>
                      {fmtSize(a.size)} · {a.uploaderName ?? '—'} · {stamp(a.at)}
                    </Text>
                  </View>
                </Pressable>
                {a.canDelete && !closed && (
                  <Pressable
                    onPress={() => remove(a)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('action.delete')} — ${a.name}`}
                    style={s.del}
                  >
                    <Ic name="trash" s={18} c={c.danger} />
                  </Pressable>
                )}
              </View>
            ))}
            {!!sending && (
              <View style={[s.row, { backgroundColor: c.surface, borderColor: c.line }]} accessibilityLiveRegion="polite">
                <View style={[s.ic, { backgroundColor: c.surface2 }]}><Ic name="upload" s={20} c={c.muted} /></View>
                <Text numberOfLines={1} style={[s.name, s.meta, { color: c.muted }]}>{t('files.sending', { n: sending })}</Text>
              </View>
            )}
          </ScrollView>
        )}

      {!!data && !closed && (
        <View style={[s.composer, { borderTopColor: c.line, backgroundColor: c.surface }]}>
          <View style={s.btns}>
            <Button label={t('files.addDoc')} icon="paperclip" variant="primary" disabled={!!sending || full} onPress={pickDocument} style={s.grow} />
            <Button label={t('files.addPhoto')} icon="image" variant="ghost" disabled={!!sending || full} onPress={pickPhoto} style={s.grow} />
          </View>
          <Text style={[s.hint, { color: c.hint }]}>{full ? t('files.full') : t('files.hint', { max: fmtSize(data.maxFileBytes) })}</Text>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  err: { marginBottom: 8 },
  pad: { paddingTop: 8 },
  list: { paddingBottom: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.control, paddingRight: 6 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, minHeight: 56 },
  ic: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, minWidth: 0 },
  name: { fontSize: 14.5, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  del: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  composer: { gap: 8, paddingTop: 10, borderTopWidth: 1 },
  btns: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  hint: { fontSize: 12, textAlign: 'center' },
})
