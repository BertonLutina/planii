import { Image } from 'expo-image'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic } from '@/components/ui'
import { formatDue, initials } from '@/lib/dates'
import { t } from '@/lib/i18n'
import { prioMeta } from '@/lib/priority'
import { usePv } from '@/theme/ThemeProvider'
import { alpha, avatarColor, mix } from './colors'

/* Pastilles de la page projet — `.pv-av`, `.pv-pill`, `.pv-pr`, `.pv-due`, `.pv-fb`
   de planii-vite/src/project-v3.css, à l'identique. */

export function PvAvatar({ name, src, size = 30, style }: {
  name?: string; src?: string | null; size?: number; style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      accessible
      accessibilityLabel={name || undefined}
      style={[s.av, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name) }, style]}
    >
      {src
        ? <Image source={{ uri: src }} style={{ width: size, height: size }} contentFit="cover" />
        : <Text style={[s.avTxt, { fontSize: size <= 24 ? 10 : 11 }]}>{initials(name)}</Text>}
    </View>
  )
}

/** Pastille de statut : fond = 16 % de la couleur du statut, texte = 58 % mélangé au texte du thème. */
export function StatusPill({ label, color, onPress }: { label: string; color: string; onPress?: () => void }) {
  const pv = usePv()
  const body = (
    <>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={[s.pillTxt, { color: mix(color, pv.text, 58) }]}>{label}</Text>
    </>
  )
  const box = [s.pill, { backgroundColor: alpha(color, 0.16) }]
  if (!onPress) return <View style={box}>{body}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={box}>
      {body}
    </Pressable>
  )
}

/** Priorité : P1 rouge, P2 ambre, P3–P6 neutres — avec le drapeau, comme le web. */
export function PrioChip({ priority, onPress }: { priority?: number | null; onPress?: () => void }) {
  const pv = usePv()
  const pm = prioMeta(priority)
  const tone = pm.n === 1 ? { bg: pv.dgBg, fg: pv.dg } : pm.n === 2 ? { bg: pv.wnBg, fg: pv.wn } : { bg: pv.col, fg: pv.muted }
  const body = (
    <>
      <Ic name="flag" s={13} c={tone.fg} strokeWidth={2.2} />
      <Text style={[s.prTxt, { color: tone.fg }]}>{pm.tag}</Text>
    </>
  )
  const box = [s.pr, { backgroundColor: tone.bg }]
  if (!onPress) return <View style={box} accessible accessibilityLabel={`${pm.tag} — ${pm.label}`}>{body}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${pm.tag} — ${pm.label}`} hitSlop={8} style={box}>
      {body}
    </Pressable>
  )
}

export function DueLabel({ due, late }: { due: string; late: boolean }) {
  const pv = usePv()
  const col = late ? pv.dg : pv.muted
  return (
    <View style={s.due}>
      <Ic name={late ? 'alert' : 'calendar'} s={15} c={col} />
      <Text style={{ color: col, fontSize: 14, fontWeight: late ? '700' : '500', fontVariant: ['tabular-nums'] }}>{formatDue(due)}</Text>
    </View>
  )
}

/** Trombone + nombre de fichiers (`.pv-fb`). */
export function FileBadge({ n }: { n: number }) {
  const pv = usePv()
  return (
    <View style={[s.fb, { backgroundColor: pv.accBg }]} accessible accessibilityLabel={`${t('files.title')} : ${n}`}>
      <Ic name="paperclip" s={15} c={pv.accFg} strokeWidth={2.2} />
      <Text style={{ color: pv.accFg, fontSize: 13, fontWeight: '700' }}>{n}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avTxt: { color: '#fff', fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 30, paddingLeft: 11, paddingRight: 13, borderRadius: 15, alignSelf: 'flex-start', maxWidth: '100%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillTxt: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  pr: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingLeft: 8, paddingRight: 10, borderRadius: 8 },
  prTxt: { fontSize: 12.5, fontWeight: '800' },
  due: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fb: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14 },
})
