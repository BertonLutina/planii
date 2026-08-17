import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, Button, EmptyState, Ic, Sheet } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api } from '@/lib/api'
import { t, useI18n } from '@/lib/i18n'
import type { Poll, Project } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'

/* Onglet « Sondages » — portage de `PollsTab`.
   Chaque option est une cible tactile pleine largeur : la barre de résultat est
   un fond, jamais du texte posé sur une couleur. Le vote choisi porte une coche
   en plus de la bordure — l'information n'est pas dans la couleur seule. */

export interface PollsTabProps {
  p: Project
  reload: () => void
}

export function PollsTab({ p, reload }: PollsTabProps) {
  const insets = useSafeAreaInsets()
  useI18n()

  const [creating, setCreating] = useState(false)
  const closed = p.status === 'done'

  async function vote(pollId: string, optionId: string) {
    try { await api('POST', '/polls/' + pollId + '/vote', { optionId }); reload() }
    catch (e) { toastErrAfterSheet(errMsg(e)) }
  }

  return (
    <View style={s.fill}>
      <FlatList
        data={p.polls}
        keyExtractor={(x) => x.id}
        ListHeaderComponent={
          closed
            ? null
            : <Button label={t('pd.launchPoll')} icon="poll" variant="primary" block onPress={() => setCreating(true)} style={s.new} />
        }
        /* Pas d'action ici : le bouton principal est juste au-dessus. */
        ListEmptyComponent={
          <EmptyState icon="poll" title={t('pd.noPolls')} message={closed ? t('pd.closedX') : undefined} />
        }
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PollCard poll={item} closed={closed} onVote={vote} />}
      />

      <NewPollSheet open={creating} onClose={() => setCreating(false)} projectId={p.id} onCreated={reload} />
    </View>
  )
}

function PollCard({ poll, closed, onVote }: { poll: Poll; closed: boolean; onVote: (p: string, o: string) => void }) {
  const { c } = useTheme()
  const total = poll.options.reduce((n, o) => n + o.votes, 0)

  return (
    <View style={[s.card, { borderColor: c.line, backgroundColor: c.surface }]}>
      <Text style={[s.question, { color: c.text }]}>{poll.question}</Text>
      <View style={s.opts}>
        {poll.options.map((o) => {
          const pct = total ? Math.round((o.votes / total) * 100) : 0
          const mine = poll.myVote === o.id
          return (
            <Pressable
              key={o.id}
              onPress={closed ? undefined : () => onVote(poll.id, o.id)}
              disabled={closed}
              accessibilityRole="radio"
              accessibilityLabel={`${o.label} — ${o.votes} · ${pct} %`}
              accessibilityState={{ checked: mine, disabled: closed }}
              style={({ pressed }) => [
                s.opt,
                {
                  borderColor: mine ? c.accent : c.line,
                  borderWidth: mine ? 1.5 : 1,
                  backgroundColor: pressed && !closed ? c.surface2 : c.bg,
                },
              ]}
            >
              <View style={[s.fill0, { width: `${pct}%`, backgroundColor: mine ? c.accentBg : c.surface2 }]} />
              {mine && <Ic name="circle-check" s={15} c={c.accent} strokeWidth={2.2} />}
              <Text numberOfLines={2} style={[s.optLbl, { color: mine ? c.accentOn : c.text }]}>{o.label}</Text>
              <Text style={[s.optPct, { color: c.muted }]}>{o.votes} · {pct} %</Text>
            </Pressable>
          )
        })}
      </View>
      {/* Total des votes : icône + nombre. Le mot « vote(s) » n'a pas de clé
          i18n dans ce projet et `src/lib` est hors de portée ici — le libellé
          d'accessibilité porte le sens. */}
      <View accessible accessibilityLabel={`${total} — ${t('pd.tabPolls')}`} style={s.total}>
        <Ic name="poll" s={13} c={c.hint} />
        <Text style={[s.totalTxt, { color: c.muted }]}>{total}</Text>
      </View>
    </View>
  )
}

function NewPollSheet({
  open, onClose, projectId, onCreated,
}: { open: boolean; onClose: () => void; projectId: string; onCreated: () => void }) {
  useI18n()
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<string[]>(['', ''])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) return
    setQ(''); setOpts(['', '']); setErr(null); setBusy(false)
  }, [open])

  async function create() {
    const options = opts.map((o) => o.trim()).filter(Boolean)
    if (!q.trim()) { setErr(t('pd.titleReq')); return }
    if (options.length < 2) { setErr(t('pd.needPart')); return }
    setErr(null)
    setBusy(true)
    try {
      await api('POST', '/projects/' + projectId + '/polls', { question: q.trim(), options })
      onClose()
      toastAfterSheet(t('msg.saved'))
      onCreated()
    } catch (e) {
      setBusy(false)
      onClose()
      toastErrAfterSheet(errMsg(e))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* création en cours */ } : onClose}
      title={t('pd.launchPoll')}
      actions={
        <>
          <Button label={t('pd.launchPoll')} variant="primary" loading={busy} onPress={create} style={s.grow} />
          <Button label={t('action.cancel')} variant="ghost" disabled={busy} onPress={onClose} style={s.grow} />
        </>
      }
    >
      {!!err && <Banner tone="danger" icon="alert" text={err} />}
      <MicField
        label={t('pd.question')}
        value={q}
        onChangeText={(v) => { setErr(null); setQ(v) }}
        placeholder="Ex. Quelle date pour le lancement ?"
      />
      {opts.map((o, i) => (
        <MicField
          key={i}
          label={`Option ${i + 1}`}
          value={o}
          onChangeText={(v) => setOpts((list) => list.map((x, j) => (j === i ? v : x)))}
          returnKeyType="next"
        />
      ))}
      <Button label={t('action.add')} icon="plus" size="sm" onPress={() => setOpts((l) => [...l, ''])} />
    </Sheet>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flex: 1 },
  list: { paddingHorizontal: 18, paddingTop: 12 },
  new: { marginBottom: 14 },
  card: { borderWidth: 1, borderRadius: radius.card, padding: 14, marginBottom: 12 },
  question: { fontSize: 15.5, fontWeight: '700', lineHeight: 21 },
  opts: { marginTop: 12, gap: 8 },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 46, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radius.control, overflow: 'hidden',
  },
  fill0: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  optLbl: { flex: 1, fontSize: 14, fontWeight: '600' },
  optPct: { fontSize: 12, fontWeight: '700' },
  total: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  totalTxt: { fontSize: 12.5, fontWeight: '700' },
})
