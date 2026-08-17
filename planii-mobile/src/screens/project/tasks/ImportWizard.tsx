import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { File as FsFile } from 'expo-file-system'
import { Banner, Button, Chip, EmptyState, Field, Ic, Sheet, SkeletonList } from '@/components/ui'
import { api } from '@/lib/api'
import { t, useI18n } from '@/lib/i18n'
import {
  draftFromModeA, draftsFromModeB, draftsFromModeC, maxCols,
  type ColumnMapping, type ImportTaskDraft,
} from '@/lib/taskImportModes'
import { colLabel, fetchPublicGoogleSheet, parseCsvText, parseWorkbook, type ImportSheet } from '@/lib/taskImportParse'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { ChipSelect, type ChipOption } from '../controls/ChipSelect'
import { useSheetBody } from '../controls/useSheetBody'
import { errMsg, toastAfterSheet } from '../lib/flow'

/* Import de tâches — portage de `TaskImportWizard`
   (planii-vite/src/components/TaskImportWizard.tsx). Même analyse (`@/lib/
   taskImportParse`, `taskImportModes`), mêmes modes A/B/C, même envoi
   `POST /projects/:id/tasks/bulk`.

   Trois écarts assumés avec le web :
   1. Le « coller un tableau » disparaît. Sur téléphone on ne copie pas une
      plage Excel : le presse-papier ne contient qu'une chaîne, souvent sans
      tabulations, et la zone de texte multiligne mangerait la moitié de la
      feuille pour un résultat aléatoire. Fichier et lien Google couvrent les
      deux vrais chemins.
   2. La grille de tableur devient une liste de lignes, chaque cellule étant
      une puce appuyable (« B · Relire le chapitre »). Une vraie grille à
      320 pt donnerait trois colonnes de 100 pt à toucher au doigt — le mode B
      (colonnes + cases à cocher) reste le chemin recommandé, il est en tête.
   3. Une cinquième étape « Aperçu » remplace le panneau latéral du web : sur
      une colonne, la liste des tâches à créer doit se voir avant l'envoi.

   Les erreurs restent en ligne (`Banner`) : jamais de toast sous une feuille. */

type Step = 'source' | 'sheet' | 'mode' | 'select' | 'preview'
type Mode = 'A' | 'B' | 'C'

const STEPS: Step[] = ['source', 'sheet', 'mode', 'select', 'preview']
const STEP_KEY: Record<Step, string> = {
  source: 'imp.stepSource',
  sheet: 'imp.stepSheet',
  mode: 'imp.stepMode',
  select: 'imp.stepSelect',
  preview: 'imp.preview',
}

const ACCEPT = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
]

const MAX = 500

export interface ImportWizardProps {
  open: boolean
  onClose: () => void
  projectId: string
  /** Rechargement du projet après import (la feuille est déjà fermée). */
  onImported: () => void
}

export function ImportWizard({ open, onClose, projectId, onImported }: ImportWizardProps) {
  const { c } = useTheme()
  useI18n()
  const body = useSheetBody(0.58, 330, 540)

  const [step, setStep] = useState<Step>('source')
  const [sheets, setSheets] = useState<ImportSheet[]>([])
  const [sheetIdx, setSheetIdx] = useState(0)
  const [mode, setMode] = useState<Mode | null>(null)
  const [googleUrl, setGoogleUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cells, setCells] = useState<string[]>([])
  const [rowsSel, setRowsSel] = useState<number[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({ titleCol: 0, dueCol: null, priorityCol: null })

  useEffect(() => {
    if (open) return
    setStep('source'); setSheets([]); setSheetIdx(0); setMode(null); setGoogleUrl('')
    setErr(null); setBusy(false); setCells([]); setRowsSel([])
    setMapping({ titleCol: 0, dueCol: null, priorityCol: null })
  }, [open])

  const rows = sheets[sheetIdx]?.rows ?? []
  const cols = maxCols(rows)

  const drafts: ImportTaskDraft[] = useMemo(() => {
    if (!mode) return []
    if (mode === 'A') {
      return cells
        .map((k) => { const [r, cc] = k.split(':').map(Number); return draftFromModeA(rows, r, cc) })
        .filter((d): d is ImportTaskDraft => !!d)
    }
    if (mode === 'B') return draftsFromModeB(rows, mapping, [...rowsSel].sort((a, b) => a - b))
    return draftsFromModeC(rows, cells.map((k) => { const [r, cc] = k.split(':').map(Number); return { r, c: cc } }))
  }, [mode, rows, cells, rowsSel, mapping])

  function applySheets(next: ImportSheet[]) {
    if (!next.length) { setErr(t('imp.empty')); return }
    setErr(null)
    setSheets(next)
    setSheetIdx(0)
    setCells([])
    setRowsSel([])
    const first = next[0].rows[0] ?? []
    setMapping({ titleCol: 0, dueCol: first.length > 1 ? 1 : null, priorityCol: first.length > 2 ? 2 : null })
    setStep(next.length > 1 ? 'sheet' : 'mode')
  }

  async function pickFile() {
    setErr(null)
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ACCEPT, copyToCacheDirectory: true, multiple: false })
      if (res.canceled || !res.assets?.length) return
      const asset = res.assets[0]
      setBusy(true)
      const file = new FsFile(asset.uri)
      const isCsv = /\.csv$/i.test(asset.name ?? '') || (asset.mimeType ?? '').includes('csv')
      const parsed = isCsv
        ? parseCsvText(await file.text())
        : parseWorkbook((await file.bytes()).buffer as ArrayBuffer)
      applySheets(parsed)
    } catch (e) {
      setErr(errMsg(e) || t('imp.badFile'))
    } finally {
      setBusy(false)
    }
  }

  async function loadGoogle() {
    if (!googleUrl.trim()) return
    setErr(null)
    setBusy(true)
    try {
      applySheets(await fetchPublicGoogleSheet(googleUrl))
    } catch (e) {
      setErr(errMsg(e) || t('imp.googleFail'))
    } finally {
      setBusy(false)
    }
  }

  async function doImport() {
    if (!drafts.length || busy) return
    if (drafts.length > MAX) { setErr(t('imp.max500')); return }
    setErr(null)
    setBusy(true)
    try {
      const r = await api<{ tasks: unknown[] }>('POST', `/projects/${projectId}/tasks/bulk`, {
        tasks: drafts.map((d) => ({ title: d.title, due: d.due, priority: d.priority ?? undefined })),
      })
      const n = r.tasks?.length || drafts.length
      onClose()
      toastAfterSheet(t('imp.ok', { n }))
      onImported()
    } catch (e) {
      setBusy(false)
      setErr(errMsg(e) || t('imp.fail'))
    }
  }

  const toggleCell = (r: number, cc: number) => {
    const key = `${r}:${cc}`
    setCells((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))
  }
  const toggleRow = (r: number) => {
    setRowsSel((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))
  }
  const selectAllRows = () => {
    setRowsSel(rows.map((_, i) => i).filter((i) => (rows[i] ?? []).some((x) => x.trim())))
  }

  const stepIndex = STEPS.indexOf(step)
  const back = () => {
    if (step === 'preview') setStep('select')
    else if (step === 'select') setStep('mode')
    else if (step === 'mode') setStep(sheets.length > 1 ? 'sheet' : 'source')
    else if (step === 'sheet') setStep('source')
  }

  const colItems = (withNone: boolean): ChipOption<string>[] => [
    ...(withNone ? [{ key: '', label: '—' }] : []),
    ...Array.from({ length: Math.max(cols, 1) }, (_, i) => ({
      key: String(i),
      label: `${colLabel(i)}${rows[0]?.[i] ? ` · ${rows[0][i].slice(0, 14)}` : ''}`,
    })),
  ]

  /* Pied : une seule action principale par étape. */
  const actions = (
    <>
      {stepIndex > 0 && (
        <Button label={t('vw.prev')} variant="ghost" disabled={busy} onPress={back} style={s.grow} />
      )}
      {step === 'sheet' && <Button label={t('vw.next')} variant="primary" onPress={() => setStep('mode')} style={s.grow} />}
      {step === 'mode' && (
        <Button label={t('vw.next')} variant="primary" disabled={!mode} onPress={() => setStep('select')} style={s.grow} />
      )}
      {step === 'select' && (
        <Button
          label={`${t('imp.preview')} (${drafts.length})`}
          variant="primary"
          disabled={drafts.length === 0}
          onPress={() => setStep('preview')}
          style={s.grow}
        />
      )}
      {step === 'preview' && (
        <Button
          label={busy ? t('imp.importing') : t('imp.import', { n: drafts.length })}
          variant="primary"
          loading={busy}
          disabled={drafts.length === 0}
          onPress={doImport}
          style={s.grow}
        />
      )}
      {step === 'source' && <Button label={t('action.cancel')} variant="ghost" onPress={onClose} style={s.grow} />}
    </>
  )

  return (
    <Sheet
      open={open}
      onClose={busy ? () => { /* import en cours */ } : onClose}
      title={t('imp.title')}
      scrollable={false}
      contentStyle={body}
      actions={actions}
    >
      {/* Indicateur d'étape — 5 jalons, l'actif nommé. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.stepsWrap}
        contentContainerStyle={s.steps}
      >
        {STEPS.map((k, i) => {
          const on = k === step
          const past = i < stepIndex
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
              <Text numberOfLines={1} style={[s.stepTxt, { color: on ? c.text : c.muted }]}>{t(STEP_KEY[k])}</Text>
              {i < STEPS.length - 1 && <View style={[s.stepBar, { backgroundColor: past ? c.accent : c.line }]} />}
            </View>
          )
        })}
      </ScrollView>

      {!!err && <Banner tone="danger" icon="alert" text={err} style={s.err} />}

      {step === 'source' && (
        <ScrollView style={s.fill} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {busy
            ? <SkeletonList count={3} itemHeight={56} />
            : (
              <>
                <Pressable
                  onPress={pickFile}
                  accessibilityRole="button"
                  accessibilityLabel={t('imp.drop')}
                  style={({ pressed }) => [
                    s.drop,
                    { borderColor: c.lineStrong, backgroundColor: pressed ? c.surface2 : c.bg },
                  ]}
                >
                  <Ic name="folder" s={26} c={c.accent} />
                  <Text style={[s.dropTitle, { color: c.text }]}>{t('imp.drop')}</Text>
                  <Text style={[s.dropSub, { color: c.muted }]}>{t('imp.formats')}</Text>
                </Pressable>

                <View style={s.gap}>
                  <Field
                    label={t('imp.google')}
                    value={googleUrl}
                    onChangeText={setGoogleUrl}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    autoCapitalize="none"
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={loadGoogle}
                  />
                  <Button
                    label={t('imp.loadGoogle')}
                    icon="link"
                    disabled={!googleUrl.trim()}
                    onPress={loadGoogle}
                  />
                </View>
              </>
            )}
        </ScrollView>
      )}

      {step === 'sheet' && (
        <ScrollView style={s.fill} showsVerticalScrollIndicator={false}>
          <Text style={[s.hint, { color: c.muted }]}>{t('imp.pickSheet')}</Text>
          <View style={s.chips}>
            {sheets.map((sh, i) => (
              <Chip
                key={sh.name + i}
                label={`${sh.name} (${sh.rows.length})`}
                tone={i === sheetIdx ? 'accent' : 'neutral'}
                selected={i === sheetIdx}
                onPress={() => { setSheetIdx(i); setCells([]); setRowsSel([]) }}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {step === 'mode' && (
        <ScrollView style={s.fill} showsVerticalScrollIndicator={false}>
          {(['B', 'A', 'C'] as Mode[]).map((m) => {
            const on = mode === m
            return (
              <Pressable
                key={m}
                onPress={() => { setMode(m); setCells([]); setRowsSel([]) }}
                accessibilityRole="radio"
                accessibilityLabel={t(`imp.mode${m}`)}
                accessibilityState={{ checked: on }}
                style={({ pressed }) => [
                  s.mode,
                  {
                    borderColor: on ? c.accent : c.line,
                    borderWidth: on ? 1.5 : 1,
                    backgroundColor: on ? c.accentBg : pressed ? c.surface2 : c.surface,
                  },
                ]}
              >
                <Text style={[s.modeTitle, { color: on ? c.accentOn : c.text }]}>{t(`imp.mode${m}`)}</Text>
                <Text style={[s.modeTxt, { color: on ? c.accentOn : c.muted }]}>{t(`imp.mode${m}X`)}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {step === 'select' && mode === 'B' && (
        <View style={s.fill}>
          <ScrollView style={s.mapBox} showsVerticalScrollIndicator={false}>
            <ChipSelect
              label={t('imp.colTitle')}
              options={colItems(false)}
              value={String(mapping.titleCol)}
              onChange={(v) => setMapping({ ...mapping, titleCol: Number(v) })}
              scroll
            />
            <ChipSelect
              label={t('imp.colDue')}
              options={colItems(true)}
              value={mapping.dueCol == null ? '' : String(mapping.dueCol)}
              onChange={(v) => setMapping({ ...mapping, dueCol: v === '' ? null : Number(v) })}
              scroll
            />
            <ChipSelect
              label={t('imp.colPrio')}
              options={colItems(true)}
              value={mapping.priorityCol == null ? '' : String(mapping.priorityCol)}
              onChange={(v) => setMapping({ ...mapping, priorityCol: v === '' ? null : Number(v) })}
              scroll
            />
            <Button label={t('imp.selectAllRows')} size="sm" icon="check" onPress={selectAllRows} />
          </ScrollView>
          <FlatList
            style={s.fill}
            data={rows}
            keyExtractor={(_, i) => 'r' + i}
            contentContainerStyle={s.rowList}
            ListEmptyComponent={<EmptyState icon="inbox" title={t('imp.empty')} />}
            renderItem={({ item, index }) => {
              const on = rowsSel.includes(index)
              const title = (item[mapping.titleCol] ?? '').trim()
              if (!title) return null
              const extra = [
                mapping.dueCol != null ? item[mapping.dueCol] : '',
                mapping.priorityCol != null ? item[mapping.priorityCol] : '',
              ].filter(Boolean).join(' · ')
              return (
                <Pressable
                  onPress={() => toggleRow(index)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={title}
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => [
                    s.pickRow,
                    {
                      borderColor: on ? c.accent : c.line,
                      backgroundColor: on ? c.accentBg : pressed ? c.surface2 : c.surface,
                    },
                  ]}
                >
                  <View style={[s.mark, { borderColor: on ? c.accent : c.lineStrong, backgroundColor: on ? c.accent : 'transparent' }]}>
                    {on && <Ic name="check" s={12} c={c.onAccent} strokeWidth={2.8} />}
                  </View>
                  <View style={s.pickBody}>
                    <Text numberOfLines={2} style={[s.pickTitle, { color: on ? c.accentOn : c.text }]}>{title}</Text>
                    {!!extra && <Text numberOfLines={1} style={[s.pickSub, { color: c.muted }]}>{extra}</Text>}
                  </View>
                </Pressable>
              )
            }}
          />
        </View>
      )}

      {step === 'select' && (mode === 'A' || mode === 'C') && (
        <FlatList
          style={s.fill}
          data={rows}
          keyExtractor={(_, i) => 'r' + i}
          contentContainerStyle={s.rowList}
          ListHeaderComponent={<Text style={[s.hint, { color: c.muted }]}>{t(`imp.mode${mode}X`)}</Text>}
          ListEmptyComponent={<EmptyState icon="inbox" title={t('imp.empty')} />}
          renderItem={({ item, index }) => {
            const filled = item.map((v, i) => ({ v, i })).filter((x) => x.v.trim())
            if (!filled.length) return null
            return (
              <View style={s.cellRow}>
                <Text style={[s.rowLbl, { color: c.hint }]}>{index + 1}</Text>
                <View style={s.chips}>
                  {filled.map(({ v, i }) => {
                    const on = cells.includes(`${index}:${i}`)
                    return (
                      <Chip
                        key={i}
                        label={`${colLabel(i)} · ${v.length > 26 ? v.slice(0, 25) + '…' : v}`}
                        tone={on ? 'accent' : 'neutral'}
                        selected={on}
                        onPress={() => toggleCell(index, i)}
                      />
                    )
                  })}
                </View>
              </View>
            )
          }}
        />
      )}

      {step === 'preview' && (
        <FlatList
          style={s.fill}
          data={drafts.slice(0, 80)}
          keyExtractor={(d) => d.key}
          contentContainerStyle={s.rowList}
          ListEmptyComponent={<EmptyState icon="inbox" title={t('imp.previewEmpty')} />}
          ListFooterComponent={
            drafts.length > 80
              ? <Text style={[s.hint, { color: c.muted }]}>+{drafts.length - 80}</Text>
              : null
          }
          renderItem={({ item }) => (
            <View style={[s.previewRow, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Text numberOfLines={2} style={[s.pickTitle, { color: c.text }]}>{item.title}</Text>
              {(item.due || item.priority != null) && (
                <Text style={[s.pickSub, { color: c.muted }]}>
                  {item.due ?? ''}{item.due && item.priority != null ? ' · ' : ''}
                  {item.priority != null ? 'P' + item.priority : ''}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </Sheet>
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
  hint: { fontSize: 13.5, lineHeight: 19, marginBottom: 10 },
  drop: {
    alignItems: 'center', gap: 6, paddingVertical: 26, paddingHorizontal: 16,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.card,
  },
  dropTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  dropSub: { fontSize: 12.5, textAlign: 'center' },
  gap: { marginTop: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, flex: 1 },
  mode: { padding: 13, borderRadius: radius.card, marginBottom: 10, gap: 4 },
  modeTitle: { fontSize: 14.5, fontWeight: '800' },
  modeTxt: { fontSize: 12.5, lineHeight: 18 },
  mapBox: { flexGrow: 0, maxHeight: 210, marginBottom: 10 },
  rowList: { paddingBottom: 12, gap: 8 },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: radius.control, padding: 11, minHeight: 50,
  },
  mark: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  pickBody: { flex: 1, minWidth: 0 },
  pickTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  pickSub: { fontSize: 12, marginTop: 2 },
  cellRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowLbl: { fontSize: 11.5, fontWeight: '800', width: 20, paddingTop: 8, textAlign: 'right' },
  previewRow: { borderWidth: 1, borderRadius: radius.control, padding: 11 },
})
