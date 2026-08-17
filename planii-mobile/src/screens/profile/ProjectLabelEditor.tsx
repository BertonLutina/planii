import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Banner, Button, Card, SectionHeader, Sheet, Skeleton } from '@/components/ui'
import { MicField } from '@/components/Mic'
import { Ic } from '@/components/Icon'
import { api } from '@/lib/api'
import { t, trTerm } from '@/lib/i18n'
import type { ProjectLabel } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Libellés de projets — portage de `ProjectLabelEditor` (planii-vite/src/App.tsx).
   Les couleurs manipulées ici sont des *données* (elles teintent les projets de
   l'utilisateur et doivent rester identiques en clair comme en sombre) : ce ne
   sont pas des jetons de thème. La palette par défaut reproduit celle du
   serveur (`planii-backend/src/lib/constants.ts` → PROJECT_LABEL_COLORS) pour
   savoir quelles couleurs sont supprimables. */
const DEFAULT_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']

/** Teintes proposées en plus de la palette — le web ouvre `<input type=color>`,
 *  qui n'existe pas en natif : on offre une roue de 12 teintes régulières. */
const EXTRA_COLORS = Array.from({ length: 12 }, (_, i) => hslHex(i * 30, 68, 52))

function hslHex(h: number, sPct: number, lPct: number): string {
  const s = sPct / 100
  const l = lPct / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const hex = (n: number) => Math.round(f(n) * 255).toString(16).padStart(2, '0')
  return `#${hex(0)}${hex(8)}${hex(4)}`
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const isDefault = (c: string) => DEFAULT_COLORS.some((d) => same(d, c))

/** Luminance perçue d'un `#rrggbb` (0 = noir, 1 = blanc). */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  if (h.length !== 6) return 0.5
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function ProjectLabelEditor() {
  const { c } = useTheme()
  const [labels, setLabels] = useState<ProjectLabel[]>([])
  const [palette, setPalette] = useState<string[]>(DEFAULT_COLORS)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    setLoadErr(null)
    try {
      const r = await api<{ labels: ProjectLabel[]; colors?: string[] }>('GET', '/project-labels')
      setLabels(r.labels ?? [])
      setPalette(r.colors && r.colors.length ? r.colors : DEFAULT_COLORS)
    } catch (e) {
      setLoadErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <>
      <SectionHeader
        title={t('profile.labels')}
        actionLabel={loading || loadErr ? undefined : t('action.edit')}
        onAction={loading || loadErr ? undefined : () => setOpen(true)}
      />
      <Card>
        <Text style={[s.desc, { color: c.muted }]}>{t('profile.labelsDesc')}</Text>

        {loading && (
          <View style={s.chips}>
            <Skeleton width={92} height={26} borderRadius={radius.pill} />
            <Skeleton width={74} height={26} borderRadius={radius.pill} />
            <Skeleton width={110} height={26} borderRadius={radius.pill} />
          </View>
        )}

        {!loading && !!loadErr && (
          <>
            <Banner tone="danger" icon="alert" text={loadErr} style={s.banner} />
            <Button label="Réessayer" icon="refresh" size="sm" onPress={() => { setLoading(true); load() }} style={s.retry} />
          </>
        )}

        {!loading && !loadErr && (
          <View style={s.chips}>
            {labels.map((l) => <LabelChip key={l.id} label={l} />)}
            {labels.length === 0 && <Text style={[s.empty, { color: c.hint }]}>{t('profile.labelsEmpty')}</Text>}
          </View>
        )}
      </Card>

      <LabelSheet
        open={open}
        onClose={() => setOpen(false)}
        labels={labels}
        palette={palette}
        setPalette={setPalette}
        reload={load}
      />
    </>
  )
}

/** Pastille de libellé : la couleur choisie par l'utilisateur porte la puce et
 *  le filet, jamais le texte — sinon un gris ardoise devient illisible sur fond
 *  sombre. Le libellé reste en couleur de texte du thème. */
function LabelChip({ label, onRemove }: { label: ProjectLabel; onRemove?: () => void }) {
  const { c } = useTheme()
  return (
    <View style={[s.chip, { borderColor: label.color, backgroundColor: c.surface }]}>
      <View style={[s.dot, { backgroundColor: label.color }]} />
      <Text numberOfLines={1} style={[s.chipTxt, { color: c.text }]}>{trTerm(label.label)}</Text>
      {!!onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('action.remove')} ${label.label}`}
        >
          <Ic name="x" s={13} c={c.muted} strokeWidth={2.2} />
        </Pressable>
      )}
    </View>
  )
}

function LabelSheet({
  open, onClose, labels, palette, setPalette, reload,
}: {
  open: boolean
  onClose: () => void
  labels: ProjectLabel[]
  palette: string[]
  setPalette: (v: string[]) => void
  reload: () => Promise<void>
}) {
  const { c } = useTheme()
  const [name, setName] = useState('')
  const [color, setColor] = useState(palette[0] ?? DEFAULT_COLORS[0])
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(''); setErr(null); setMore(false)
    setColor((cur) => (palette.some((p) => same(p, cur)) ? cur : palette[0] ?? DEFAULT_COLORS[0]))
  }, [open, palette])

  async function addPaletteColor(next: string) {
    setColor(next)
    if (palette.some((p) => same(p, next))) return
    try {
      const r = await api<{ colors: string[] }>('PATCH', '/project-label-colors', { color: next })
      setPalette(r.colors)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function removePaletteColor(target: string) {
    try {
      const r = await api<{ colors: string[] }>('DELETE', '/project-label-colors/' + encodeURIComponent(target.replace('#', '')))
      setPalette(r.colors)
      if (same(color, target)) setColor(r.colors[0] ?? DEFAULT_COLORS[0])
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function add() {
    const label = name.trim()
    if (!label) { setErr('Donne un nom au libellé'); return }
    setErr(null); setBusy(true)
    try {
      await api('POST', '/project-labels', { label, color })
      setName('')
      await reload()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setErr(null)
    try {
      await api('DELETE', '/project-labels/' + id)
      await reload()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('profile.labels')}
      actions={<Button label={t('action.done')} variant="primary" block onPress={onClose} />}
    >
      <Text style={[s.desc, { color: c.muted }]}>{t('profile.labelsDesc')}</Text>
      {!!err && <Banner tone="danger" icon="alert" text={err} style={s.banner} />}

      <View style={s.chips}>
        {labels.map((l) => (
          <LabelChip key={l.id} label={l} onRemove={l.fixed ? undefined : () => remove(l.id)} />
        ))}
        {labels.length === 0 && <Text style={[s.empty, { color: c.hint }]}>{t('profile.labelsEmpty')}</Text>}
      </View>

      <MicField
        label="Nouveau libellé"
        value={name}
        onChangeText={(v) => { setName(v); if (err) setErr(null) }}
        placeholder={t('profile.newLabel')}
        maxLength={28}
        returnKeyType="done"
        onSubmitEditing={add}
        style={s.nameField}
      />

      <Text style={[s.pickLabel, { color: c.muted }]}>Couleur</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.swatchRow}>
        {palette.map((p) => (
          <Swatch
            key={p}
            color={p}
            selected={same(p, color)}
            onPress={() => setColor(p)}
            onRemove={isDefault(p) ? undefined : () => removePaletteColor(p)}
          />
        ))}
      </ScrollView>

      <Pressable
        onPress={() => setMore((m) => !m)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Autres couleurs"
        accessibilityState={{ expanded: more }}
        style={s.moreBtn}
      >
        <Ic name={more ? 'chevron-up' : 'chevron-down'} s={15} c={c.accent} />
        <Text style={[s.moreTxt, { color: c.accent }]}>Autres couleurs</Text>
      </Pressable>

      {more && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.swatchRow}>
          {EXTRA_COLORS.map((p) => (
            <Swatch key={p} color={p} selected={same(p, color)} onPress={() => addPaletteColor(p)} />
          ))}
        </ScrollView>
      )}

      <Button
        label={t('action.add')}
        icon="plus"
        loading={busy}
        onPress={add}
        block
        style={s.addBtn}
      />
    </Sheet>
  )
}

function Swatch({
  color, selected, onPress, onRemove,
}: { color: string; selected: boolean; onPress: () => void; onRemove?: () => void }) {
  const { c, dark } = useTheme()
  /* La coche doit rester lisible sur une couleur choisie par l'utilisateur :
     on prend l'encre foncée du thème sur une pastille claire, et l'inverse. */
  const ink = luminance(color) > 0.55 ? (dark ? c.bg : c.text) : (dark ? c.text : c.bg)
  return (
    <View style={s.swatchWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityLabel={`Couleur ${color}`}
        accessibilityState={{ selected }}
        hitSlop={8}
        style={[s.swatch, { backgroundColor: color, borderColor: selected ? c.text : c.line }]}
      >
        {selected && <Ic name="check" s={15} c={ink} strokeWidth={2.6} />}
      </Pressable>
      {!!onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer la couleur ${color}`}
          style={[s.swatchX, { backgroundColor: c.surface, borderColor: c.line }]}
        >
          <Ic name="x" s={10} c={c.muted} strokeWidth={2.6} />
        </Pressable>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  desc: { fontSize: 13.5, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  empty: { fontSize: 13.5, lineHeight: 19 },
  banner: { marginTop: 12 },
  retry: { marginTop: 10, alignSelf: 'flex-start' },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: radius.pill, borderWidth: 1, maxWidth: '100%',
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  chipTxt: { fontSize: 12.5, fontWeight: '700', flexShrink: 1 },

  nameField: { marginTop: 16 },
  pickLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  swatchRow: { gap: 12, paddingVertical: 4, paddingRight: 6, paddingLeft: 2 },
  swatchWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatchX: {
    position: 'absolute', top: -4, right: -6,
    width: 18, height: 18, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  moreTxt: { fontSize: 13, fontWeight: '700' },
  addBtn: { marginTop: 8 },
})
