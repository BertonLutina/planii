import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  Banner, Button, EmptyState, Field, Ic, Pill, PriorityFlag, resolveTone, Sheet,
} from '@/components/ui'
import { MicButton } from '@/components/Mic'
import { api } from '@/lib/api'
import { formatDue } from '@/lib/dates'
import { t, trTerm, useI18n } from '@/lib/i18n'
import { PRIORITIES } from '@/lib/priority'
import {
  listen, matchFromList, parseDueDate, parsePriority, saysMe, saysNobody, saysNone,
  speak, speechSupported, stopSpeaking, type Recognizer,
} from '@/lib/speech'
import { taskTypesOf, typeTone } from '@/lib/tasktype'
import type { Project, User } from '@/lib/types'
import { prioTone } from '@/screens/projects/ChoiceRow'
import { ChipSelect, type ChipOption } from '@/screens/project/controls/ChipSelect'
import { DateField } from '@/screens/project/controls/DateField'
import { useSheetBody } from '@/screens/project/controls/useSheetBody'
import { errMsg, toastAfterSheet } from '@/screens/project/lib/flow'
import { useTheme } from '@/theme/ThemeProvider'

/* Assistant vocal guidé — portage de `planii-vite/src/components/
   VoiceTaskWizard.tsx`. Mêmes étapes, mêmes analyseurs (`@/lib/speech`), même
   `POST /projects/:id/tasks`.

   Quatre écarts assumés avec le web :

   1. La modale devient une feuille à étapes, sur le modèle de `ImportWizard`
      (même rail de jalons numérotés, même pied à une seule action principale).
   2. Chaque champ dicté reste modifiable à la main, et le contrôle manuel est
      toujours visible — pas replié derrière un « corriger ». La voix accélère,
      elle n'est jamais le seul chemin.
   3. Les erreurs restent en ligne (`Banner`) : un toast ne s'affiche pas sous
      une feuille ouverte. La confirmation de création part après la fermeture,
      via `toastAfterSheet`.
   4. L'écoute est coupée au démontage, à la fermeture, à chaque changement
      d'étape et quand l'app passe en arrière-plan (`AppState`, géré dans
      `@/lib/speech`) — un moteur laissé ouvert garde le micro. */

type StepKey = 'title' | 'priority' | 'type' | 'assignee' | 'due' | 'review'
const STEPS: StepKey[] = ['title', 'priority', 'type', 'assignee', 'due', 'review']

/** Libellés du rail — empruntés aux clés existantes des formulaires de tâche. */
const STEP_LABEL: Record<StepKey, string> = {
  title: 'qt.label',
  priority: 'td.priority',
  type: 'qt.type',
  assignee: 'td.assignee',
  due: 'td.due',
  review: 'imp.preview',
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

interface Draft {
  title: string
  priority: number
  type: string
  assigneeId: string
  due: string
}

export interface VoiceTaskWizardProps {
  open: boolean
  onClose: () => void
  p: Project
  me: User
  /** Rechargement du projet après création (la feuille est déjà fermée). */
  onCreated: () => void
}

export function VoiceTaskWizard({ open, onClose, p, me, onCreated }: VoiceTaskWizardProps) {
  const { c } = useTheme()
  useI18n()
  const body = useSheetBody(0.62, 360, 580)

  const myTypes = taskTypesOf(me)
  const roles = p.roles || []

  const [step, setStep] = useState(0)
  const [f, setF] = useState<Draft>({ title: '', priority: 6, type: myTypes[0] ?? '', assigneeId: '', due: '' })
  const [heard, setHeard] = useState('')
  const [listening, setListening] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const recRef = useRef<Recognizer | null>(null)
  const alive = useRef(true)
  const key = STEPS[step]
  const supported = speechSupported()

  /* Le web pose deux questions écrites en dur (« Quel type ? … », « Pour quelle
     date ? … ») ; `src/lib/i18n.tsx` ne peut pas accueillir de nouvelle clé
     pour ce portage, elles sont donc recomposées à partir des clés existantes.
     Elles restent lues à voix haute, d'où la ponctuation. */
  const PROMPTS: Record<StepKey, string> = {
    title: t('vw.qTitle'),
    priority: t('vw.qPrio'),
    type: `${t('qt.type')} ? ${myTypes.slice(0, 3).map(trTerm).join(', ')}, ${t('vw.noneM')}.`,
    assignee: t('vw.qWho'),
    due: `${t('td.due')} ? ${t('cal.today')}, ${t('vw.noneF')}.`,
    review: t('vw.review'),
  }

  /* Repart propre à chaque ouverture. */
  useEffect(() => {
    if (open) return
    recRef.current?.abort()
    recRef.current = null
    stopSpeaking()
    setStep(0)
    setF({ title: '', priority: 6, type: myTypes[0] ?? '', assigneeId: '', due: '' })
    setHeard('')
    setListening(false)
    setErr(null)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* À chaque étape : couper l'écoute précédente, énoncer la question. */
  useEffect(() => {
    if (!open) return
    recRef.current?.abort()
    recRef.current = null
    setListening(false)
    setHeard('')
    speak(PROMPTS[key])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, open])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; recRef.current?.abort(); stopSpeaking() }
  }, [])

  const memberName = (id: string) => p.members.find((m) => m.id === id)?.name ?? ''

  const apply = useCallback((text: string) => {
    if (key === 'title') { setF((v) => ({ ...v, title: cap(text.trim()) })); return }
    if (key === 'priority') { const n = parsePriority(text); if (n) setF((v) => ({ ...v, priority: n })); return }
    if (key === 'type') {
      if (saysNone(text)) { setF((v) => ({ ...v, type: '' })); return }
      const m = matchFromList(text, myTypes, (x) => x)
      if (m) setF((v) => ({ ...v, type: m }))
      return
    }
    if (key === 'due') { const dd = parseDueDate(text); if (dd !== null) setF((v) => ({ ...v, due: dd })); return }
    if (key !== 'assignee') return

    if (saysNobody(text)) { setF((v) => ({ ...v, assigneeId: '' })); return }
    if (saysMe(text) && p.members.some((m) => m.id === me.id)) { setF((v) => ({ ...v, assigneeId: me.id })); return }
    const byName = matchFromList(text, p.members, (m) => m.name)
    if (byName) { setF((v) => ({ ...v, assigneeId: byName.id })); return }
    const role = matchFromList(text, roles, (r) => r.name)
    const holder = role && p.members.find((m) => (m.roleIds || []).includes(role.id))
    if (holder) setF((v) => ({ ...v, assigneeId: holder.id }))
    else setErr(`${t('vw.notFound')} « ${text} »`)
  }, [key, myTypes, p.members, roles, me.id])

  function startListen() {
    if (listening) { recRef.current?.stop(); return }
    stopSpeaking()
    setErr(null)
    setHeard('')
    setListening(true)
    listen({
      onText: (txt) => setHeard(txt),
      onFinal: (txt) => { if (txt) apply(txt) },
      onEnd: () => { if (alive.current) setListening(false) },
      onError: (e) => {
        if (!alive.current) return
        setListening(false)
        if (e === 'unsupported' || e === 'not-allowed' || e === 'blocked') setErr(t('vw.noVoice'))
      },
    }).then((r) => {
      if (!alive.current) { r?.abort(); return }
      recRef.current = r
      if (!r) setListening(false)
    })
  }

  async function create() {
    if (!f.title.trim()) { setErr(t('vw.titleReq')); setStep(0); return }
    setErr(null)
    setBusy(true)
    recRef.current?.abort()
    stopSpeaking()
    try {
      await api('POST', `/projects/${p.id}/tasks`, {
        title: f.title.trim(),
        type: f.type || null,
        priority: f.priority,
        assigneeId: f.assigneeId || null,
        due: f.due || null,
      })
      onClose()
      toastAfterSheet(t('vw.created'))
      onCreated()
    } catch (e) {
      setBusy(false)
      setErr(errMsg(e))
    }
  }

  const typeItems: ChipOption<string>[] = [
    { key: '', label: t('vw.none') },
    ...myTypes.map((x) => ({ key: x, label: trTerm(x), tone: typeTone(x) })),
  ]
  const memberItems: ChipOption<string>[] = [
    { key: '', label: t('vw.toTakeOpt'), tone: 'warn' },
    ...p.members.map((m) => ({ key: m.id, label: m.id === me.id ? `${m.name} ${t('vw.me')}` : m.name })),
  ]

  const canNext = key !== 'title' || f.title.trim().length > 0
  const next = () => setStep((n) => Math.min(n + 1, STEPS.length - 1))
  const prev = () => setStep((n) => Math.max(n - 1, 0))

  const actions = (
    <>
      {step > 0 && <Button label={t('vw.prev')} variant="ghost" disabled={busy} onPress={prev} style={s.grow} />}
      {key !== 'review'
        ? <Button label={t('vw.next')} variant="primary" disabled={!canNext} onPress={next} style={s.grow} />
        : (
          <Button
            label={busy ? t('vw.creating') : t('vw.createTask')}
            variant="primary"
            loading={busy}
            onPress={create}
            style={s.grow}
          />
        )}
    </>
  )

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* création en cours */ } : onClose}
      title={t('vw.title')}
      scrollable={false}
      contentStyle={body}
      actions={actions}
    >
      {/* Rail d'étapes — six jalons, l'actif nommé. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.stepsWrap}
        contentContainerStyle={s.steps}
      >
        {STEPS.map((k, i) => {
          const on = i === step
          const past = i < step
          return (
            <View key={k} style={s.stepItem}>
              <View
                style={[
                  s.stepDot,
                  {
                    backgroundColor: on ? c.accent : past ? c.accentBg : c.surface2,
                    borderColor: on ? c.accent : past ? c.accent : c.line,
                  },
                ]}
              >
                {past
                  ? <Ic name="check" s={12} c={c.accent} strokeWidth={2.6} />
                  : <Text style={[s.stepNum, { color: on ? c.onAccent : c.muted }]}>{i + 1}</Text>}
              </View>
              <Text numberOfLines={1} style={[s.stepTxt, { color: on ? c.text : c.muted }]}>{t(STEP_LABEL[k])}</Text>
              {i < STEPS.length - 1 && <View style={[s.stepBar, { backgroundColor: past ? c.accent : c.line }]} />}
            </View>
          )
        })}
      </ScrollView>

      {!!err && <Banner tone="danger" icon="alert" text={err} style={s.err} />}

      <ScrollView style={s.fill} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {key !== 'review' ? (
          <>
            <Text style={[s.question, { color: c.text }]}>{PROMPTS[key]}</Text>

            {supported ? (
              <View style={s.micRow}>
                <MicButton rec={listening} size={64} round label={t('vw.speak')} onPress={startListen} />
                <Text style={[s.micHint, { color: c.muted }]}>
                  {listening ? t('vw.listening') : t('vw.press')}
                </Text>
              </View>
            ) : (
              /* Sous Expo Go la reconnaissance n'existe pas : l'assistant reste
                 utilisable au doigt, il perd juste son accélérateur. */
              <Banner tone="warn" icon="info" text={t('vw.noVoice')} style={s.err} />
            )}

            {!!heard && (
              <View accessibilityLiveRegion="polite" style={[s.heard, { backgroundColor: c.surface2 }]}>
                <Text style={[s.heardTxt, { color: c.text }]}>« {heard} »</Text>
              </View>
            )}

            {/* Correction manuelle — toujours présente, jamais un repli. */}
            <View style={s.manual}>
              {/* Champ nu, pas un `MicField` : l'orbe au-dessus est déjà le
                  micro de l'étape, deux micros dans la même vue sèmeraient le
                  doute (l'un remplace l'intitulé, l'autre l'allongerait). */}
              {key === 'title' && (
                <Field
                  label={t('qt.label')}
                  value={f.title}
                  onChangeText={(v) => { setErr(null); setF({ ...f, title: v }) }}
                  placeholder={t('vw.titlePh')}
                  returnKeyType="done"
                />
              )}
              {key === 'priority' && (
                <ChipSelect
                  label={t('td.priority')}
                  options={PRIORITIES.map((n) => ({ key: String(n), label: 'P' + n, tone: prioTone(n) }))}
                  value={String(f.priority)}
                  onChange={(v) => setF({ ...f, priority: Number(v) })}
                />
              )}
              {key === 'type' && (
                <ChipSelect label={t('qt.type')} options={typeItems} value={f.type} onChange={(v) => setF({ ...f, type: v })} />
              )}
              {key === 'assignee' && (
                <ChipSelect
                  label={t('td.assignee')}
                  options={memberItems}
                  value={f.assigneeId}
                  onChange={(v) => { setErr(null); setF({ ...f, assigneeId: v }) }}
                />
              )}
              {key === 'due' && (
                <DateField
                  label={t('td.due')}
                  value={f.due}
                  onChange={(v) => setF({ ...f, due: v })}
                  placeholder={t('vw.noneF')}
                />
              )}
            </View>
          </>
        ) : f.title.trim() ? (
          <View style={s.review}>
            <ReviewRow label={t('qt.label')}>
              <Text style={[s.value, { color: c.text }]}>{f.title}</Text>
            </ReviewRow>
            <ReviewRow label={t('td.priority')}>
              <PriorityFlag priority={f.priority} />
            </ReviewRow>
            <ReviewRow label={t('qt.type')}>
              {f.type
                ? <Pill label={trTerm(f.type)} tone={resolveTone(typeTone(f.type))} />
                : <Text style={[s.dim, { color: c.hint }]}>{t('vw.noneM')}</Text>}
            </ReviewRow>
            <ReviewRow label={t('td.assignee')}>
              {f.assigneeId
                ? <Text style={[s.value, { color: c.text }]}>{memberName(f.assigneeId)}</Text>
                : <Text style={[s.dim, { color: c.hint }]}>{t('vw.toTake')}</Text>}
            </ReviewRow>
            <ReviewRow label={t('td.due')} last>
              {f.due
                ? <Text style={[s.value, { color: c.text }]}>{formatDue(f.due)}</Text>
                : <Text style={[s.dim, { color: c.hint }]}>{t('vw.noneF')}</Text>}
            </ReviewRow>
          </View>
        ) : (
          <EmptyState
            icon="mic"
            title={t('vw.titleReq')}
            message={t('vw.qTitle')}
            actionLabel={t('vw.prev')}
            onAction={() => setStep(0)}
          />
        )}
      </ScrollView>
    </Sheet>
  )
}

function ReviewRow({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  const { c } = useTheme()
  return (
    <View style={[s.line, { borderBottomColor: c.line, borderBottomWidth: last ? 0 : 1 }]}>
      <Text style={[s.lineLabel, { color: c.muted }]}>{label}</Text>
      <View style={s.lineValue}>{children}</View>
    </View>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  fill: { flex: 1 },
  /* Un ScrollView vaut `flexGrow: 1` : dans une feuille de hauteur ferme il
     faut le ramener à la taille de son contenu. */
  stepsWrap: { flexGrow: 0, flexShrink: 0 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 14, paddingRight: 6 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 11, fontWeight: '800' },
  stepTxt: { fontSize: 12, fontWeight: '700' },
  stepBar: { width: 14, height: 2, borderRadius: 1, marginHorizontal: 2 },
  err: { marginBottom: 10 },

  question: { fontSize: 17, fontWeight: '600', lineHeight: 24, marginBottom: 12 },
  micRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  micHint: { fontSize: 14, flexShrink: 1 },
  heard: { marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
  heardTxt: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  manual: { marginTop: 16 },

  review: { paddingTop: 4 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  lineLabel: { fontSize: 13.5 },
  lineValue: { flexShrink: 1, alignItems: 'flex-end' },
  value: { fontSize: 14.5, fontWeight: '700', textAlign: 'right' },
  dim: { fontSize: 14 },
})
