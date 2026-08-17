import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, Banner, Button, EmptyState, Ic, SkeletonList } from '@/components/ui'
import { Mic } from '@/components/Mic'
import { api } from '@/lib/api'
import { canManage } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import { useRealtime } from '@/lib/realtime'
import type { Project, TaskStatus, User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { errMsg } from '../lib/flow'
import { MeetingTaskSheet } from './MeetingTaskSheet'
import { DelegatesSheet } from './DelegatesSheet'

/* Onglet « Réunion » — portage de `Meeting` (planii-vite/src/components/
   Meeting.tsx).

   La visioconférence Jitsi du web n'a pas d'équivalent embarqué ici (pas de
   SDK natif installé, et un WebView Jitsi ne survit pas à un changement
   d'onglet) : elle est reportée. Ce qui traverse, c'est le fil de discussion —
   la partie qui produit les tâches — avec la même liste de délégués et le même
   `POST /projects/:id/meeting/tasks`.

   Le fil est une liste inversée : le dernier message est en bas, sans calcul
   de défilement, et le composeur reste collé au-dessus du clavier. */

export interface MeetingMessage {
  id: string
  userId: string
  userName: string
  body: string
  createdTaskId?: string | null
  at: string
  /** Message envoyé mais pas encore confirmé par le serveur. */
  pending?: boolean
}

const clock = (at: string) =>
  new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Titre de tâche déduit d'un message (même règle que le web). */
export const inferTaskTitle = (body: string): string => {
  const clean = body.trim().replace(/\s+/g, ' ')
  return clean.length <= 56 ? clean : clean.slice(0, 53).trim() + '…'
}

export interface MeetingTabProps {
  p: Project
  me: User
  statuses: TaskStatus[]
  /** Rechargement du projet (une tâche créée depuis la réunion). */
  onChanged: () => void
}

export function MeetingTab({ p, me, statuses, onChanged }: MeetingTabProps) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  useI18n()

  const [items, setItems] = useState<MeetingMessage[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [delegates, setDelegates] = useState<string[]>([])
  const [taskFrom, setTaskFrom] = useState<MeetingMessage | null>(null)
  const [delegatesOpen, setDelegatesOpen] = useState(false)
  const seq = useRef(0)

  const closed = p.status === 'done'
  const manage = canManage(p.my_role)
  const canCreate = !closed && (manage || delegates.includes(me.id))

  /* Projet clôturé : le serveur refuse aussi la *lecture* de la réunion
     (`assertProjectOpen` renvoie 423). Sans cette garde, l'onglet accueille
     l'utilisateur avec une erreur serveur à côté de la bannière « clôturé ».
     Le web n'a pas le problème : il masque carrément l'onglet. */
  const load = useCallback(() => {
    if (closed) { setItems([]); setErr(null); return }
    api<{ messages: MeetingMessage[] }>('GET', '/projects/' + p.id + '/meeting/messages')
      .then((r) => { setItems(r.messages); setErr(null) })
      .catch((e) => setErr(errMsg(e)))
  }, [p.id, closed])

  const loadDelegates = useCallback(() => {
    if (closed) { setDelegates([]); return }
    api<{ userIds: string[] }>('GET', '/projects/' + p.id + '/meeting/task-delegates')
      .then((r) => setDelegates(r.userIds))
      .catch(() => setDelegates([]))
  }, [p.id, closed])

  useEffect(load, [load])
  useEffect(loadDelegates, [loadDelegates])
  /* Sans amortissement : un message doit apparaître dès qu'il arrive. */
  useRealtime((m) => {
    if (m.type === 'meeting_chat' && m.projectId === p.id) { load(); loadDelegates() }
  }, 0)

  async function send() {
    const body = text.trim()
    if (!body) return
    setText('')
    /* Ajout optimiste : le message apparaît immédiatement, en attente. */
    const tmp: MeetingMessage = {
      id: 'tmp-' + (seq.current += 1),
      userId: me.id,
      userName: me.name,
      body,
      at: new Date().toISOString(),
      pending: true,
    }
    setItems((list) => [...(list ?? []), tmp])
    try {
      await api('POST', '/projects/' + p.id + '/meeting/messages', { body })
      load()
    } catch (e) {
      setItems((list) => (list ?? []).filter((x) => x.id !== tmp.id))
      setErr(errMsg(e))
      setText(body)
    }
  }

  async function saveDelegates(next: string[]) {
    const before = delegates
    setDelegates(next)
    try {
      const r = await api<{ userIds: string[] }>('PUT', '/projects/' + p.id + '/meeting/task-delegates', { userIds: next })
      setDelegates(r.userIds)
    } catch (e) {
      setDelegates(before)
      setErr(errMsg(e))
    }
  }

  /* Liste inversée : on rend du plus récent au plus ancien. */
  const reversed = items ? [...items].reverse() : []

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.fill}>
      <View style={s.top}>
        {!!err && <Banner tone="danger" icon="alert" text={err} style={s.banner} />}
        {closed && <Banner tone="warn" icon="lock" text={t('pd.closedX')} style={s.banner} />}
        {!closed && !canCreate && <Banner tone="accent" icon="info" text={t('meet.needAuth')} style={s.banner} />}
        {manage && !closed && (
          <Button
            label={t('meet.allowed')}
            icon="shield"
            size="sm"
            onPress={() => setDelegatesOpen(true)}
            style={s.delegateBtn}
          />
        )}
      </View>

      {!items
        ? <View style={s.pad}><SkeletonList count={5} itemHeight={62} /></View>
        : (
          <FlatList
            inverted
            data={reversed}
            keyExtractor={(x) => x.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState icon="message" title={t('meet.noMsg')} message={t('meet.autoDesc')} />
            }
            renderItem={({ item }) => {
              const mine = item.userId === me.id
              return (
                <View style={[s.msg, item.pending && s.pending]}>
                  <Avatar name={item.userName} size={30} />
                  <View style={s.msgBody}>
                    <View style={s.msgMeta}>
                      <Text numberOfLines={1} style={[s.who, { color: c.text }]}>
                        {item.userName}{mine ? ` ${t('vw.me')}` : ''}
                      </Text>
                      <Text style={[s.when, { color: c.hint }]}>{clock(item.at)}</Text>
                    </View>
                    <View style={[s.bubble, { backgroundColor: mine ? c.accentBg : c.surface2 }]}>
                      <Text style={[s.txt, { color: mine ? c.accentOn : c.text }]}>{item.body}</Text>
                    </View>
                    {item.createdTaskId
                      ? (
                        <View style={s.made}>
                          <Ic name="check" s={13} c={c.ok} strokeWidth={2.4} />
                          <Text style={[s.madeTxt, { color: c.okOn }]}>{t('meet.taskMade')}</Text>
                        </View>
                      )
                      : canCreate && !item.pending && (
                        <Pressable
                          onPress={() => setTaskFrom(item)}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('meet.makeTask')} — ${inferTaskTitle(item.body)}`}
                          style={s.make}
                        >
                          <Text style={[s.makeTxt, { color: c.accentOn }]}>{t('meet.makeTask')}</Text>
                        </Pressable>
                      )}
                  </View>
                </View>
              )
            }}
          />
        )}

      {!closed && (
        <View style={[s.composer, { borderTopColor: c.line, backgroundColor: c.surface, paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('meet.write')}
            placeholderTextColor={c.hint}
            multiline
            accessibilityLabel={t('meet.write')}
            style={[s.input, { backgroundColor: c.bg, borderColor: c.lineStrong, color: c.text }]}
          />
          <Mic value={text} onChange={setText} onIssue={() => setErr(t('vw.noVoice'))} />
          <Pressable
            onPress={send}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('meet.send')}
            accessibilityState={{ disabled: !text.trim() }}
            style={({ pressed }) => [
              s.send,
              { backgroundColor: pressed ? c.accent2 : c.accent, opacity: text.trim() ? 1 : 0.45 },
            ]}
          >
            <Ic name="send" s={19} c={c.onAccent} strokeWidth={2.1} />
          </Pressable>
        </View>
      )}

      <MeetingTaskSheet
        open={!!taskFrom}
        onClose={() => setTaskFrom(null)}
        p={p}
        me={me}
        statuses={statuses}
        initialTitle={taskFrom ? inferTaskTitle(taskFrom.body) : ''}
        messageId={taskFrom?.id ?? null}
        onCreated={() => { load(); onChanged() }}
      />

      <DelegatesSheet
        open={delegatesOpen}
        onClose={() => setDelegatesOpen(false)}
        p={p}
        value={delegates}
        onChange={saveDelegates}
      />
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: 18, paddingTop: 12 },
  banner: { marginBottom: 10 },
  delegateBtn: { marginBottom: 10 },
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8, gap: 14 },
  /* `inverted` retourne déjà la liste et chaque cellule : aucune transformation
     manuelle ici, elle annulerait celle de FlatList. */
  msg: { flexDirection: 'row', gap: 9 },
  pending: { opacity: 0.6 },
  msgBody: { flex: 1, minWidth: 0 },
  msgMeta: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  who: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  when: { fontSize: 11.5 },
  bubble: { marginTop: 4, padding: 10, borderRadius: radius.control, borderTopLeftRadius: 4 },
  txt: { fontSize: 14.5, lineHeight: 20 },
  make: { alignSelf: 'flex-start', paddingVertical: 6 },
  makeTxt: { fontSize: 12.5, fontWeight: '700' },
  made: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  madeTxt: { fontSize: 12.5, fontWeight: '700' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 18, paddingTop: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: radius.control,
    paddingHorizontal: 13, paddingTop: 12, paddingBottom: 10, fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
})
