import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Avatar, Banner, EmptyState, Ic, SkeletonList } from '@/components/ui'
import { Mic } from '@/components/Mic'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { TaskComment } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { errMsg } from '../lib/flow'

const stamp = (at: string) =>
  new Date(at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Commentaires d'une tâche. Le composeur reste collé au bas de la feuille
 *  (clavier évité par `Sheet`) et la liste saute au dernier message à l'envoi. */
export function TaskComments({
  taskId, closed, onCountChange,
}: { taskId: string; closed: boolean; onCountChange?: (n: number) => void }) {
  const { c } = useTheme()
  const [items, setItems] = useState<TaskComment[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<FlatList<TaskComment>>(null)

  const load = useCallback(() => {
    setErr(null)
    api<{ comments: TaskComment[] }>('GET', '/tasks/' + taskId + '/comments')
      .then((r) => { setItems(r.comments); onCountChange?.(r.comments.filter((x) => !x.deleted).length) })
      .catch((e) => setErr(errMsg(e)))
  }, [taskId, onCountChange])

  useEffect(load, [load])

  async function add() {
    const text = body.trim()
    if (!text || busy) return
    setBusy(true)
    setErr(null)
    try {
      const r = await api<{ comment: TaskComment }>('POST', '/tasks/' + taskId + '/comments', { body: text })
      setItems((list) => {
        const next = [...(list ?? []), r.comment]
        onCountChange?.(next.filter((x) => !x.deleted).length)
        return next
      })
      setBody('')
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    } catch (e) { setErr(errMsg(e)) }
    finally { setBusy(false) }
  }

  async function remove(x: TaskComment) {
    setErr(null)
    try {
      await api('DELETE', '/task-comments/' + x.id)
      setItems((list) => (list ?? []).map((y) => (
        y.id === x.id ? { ...y, body: '[commentaire supprimé]', deleted: true, canDelete: false } : y
      )))
    } catch (e) { setErr(errMsg(e)) }
  }

  return (
    <View style={s.fill}>
      {!!err && <Banner text={err} tone="danger" icon="alert" style={s.err} />}
      {!items
        ? <SkeletonList count={3} itemHeight={58} style={s.pad} />
        : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(x) => x.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.list}
            ListEmptyComponent={<EmptyState icon="message" title={t('pd.noComments')} />}
            renderItem={({ item }) => (
              <View style={s.item}>
                <Avatar name={item.userName} size={28} />
                <View style={s.itemBody}>
                  <View style={s.itemMeta}>
                    <Text numberOfLines={1} style={[s.who, { color: c.text }]}>{item.userName}</Text>
                    <Text style={[s.when, { color: c.hint }]}>{stamp(item.at)}</Text>
                  </View>
                  <View style={[s.bubble, { backgroundColor: c.surface2 }]}>
                    <Text style={[s.txt, { color: item.deleted ? c.hint : c.text }]}>{item.body}</Text>
                  </View>
                  {item.canDelete && (
                    <Pressable
                      onPress={() => remove(item)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('action.delete')} — ${item.userName}`}
                      style={s.del}
                    >
                      <Text style={[s.delTxt, { color: c.danger }]}>{t('action.delete')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          />
        )}

      {!closed && (
        <View style={[s.composer, { borderTopColor: c.line, backgroundColor: c.surface }]}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('pd.commentPh')}
            placeholderTextColor={c.hint}
            multiline
            accessibilityLabel={t('pd.commentPh')}
            style={[s.input, { backgroundColor: c.bg, borderColor: c.lineStrong, color: c.text }]}
          />
          {/* Dictée : le refus d'autorisation part dans le bandeau au-dessus —
              une feuille ouverte recouvre le calque des toasts. */}
          <Mic value={body} onChange={setBody} onIssue={() => setErr(t('vw.noVoice'))} />
          <Pressable
            onPress={add}
            disabled={busy || !body.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('pd.commentBtn')}
            accessibilityState={{ disabled: busy || !body.trim(), busy }}
            style={({ pressed }) => [
              s.send,
              { backgroundColor: pressed ? c.accent2 : c.accent, opacity: busy || !body.trim() ? 0.45 : 1 },
            ]}
          >
            <Ic name="send" s={18} c={c.onAccent} strokeWidth={2.1} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  err: { marginBottom: 8 },
  pad: { paddingTop: 8 },
  list: { paddingBottom: 12, gap: 12 },
  item: { flexDirection: 'row', gap: 9 },
  itemBody: { flex: 1, minWidth: 0 },
  itemMeta: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  who: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  when: { fontSize: 11.5 },
  bubble: { marginTop: 4, padding: 10, borderRadius: radius.control, borderTopLeftRadius: 4 },
  txt: { fontSize: 14, lineHeight: 20 },
  del: { alignSelf: 'flex-start', paddingVertical: 5 },
  delTxt: { fontSize: 12.5, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 1 },
  input: {
    flex: 1, minHeight: 44, maxHeight: 110, borderWidth: 1, borderRadius: radius.control,
    paddingHorizontal: 13, paddingTop: 12, paddingBottom: 10, fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
})
