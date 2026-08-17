import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Banner, Button, Ic, Skeleton, SkeletonList } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Petites pièces partagées par les cinq sections de l'espace admin. Elles
   n'existent pas dans le kit : `Kv` est la ligne « libellé / valeur » des
   feuilles de détail, `Meta` la ligne d'icônes des cartes, `ErrorRetry` le
   couple bandeau + bouton que chaque section rejoue à l'identique. */

export interface KvProps {
  label: string
  value: string
  /** Dernière ligne : pas de filet sous elle. */
  last?: boolean
}

/** Ligne d'une fiche : libellé à gauche, valeur à droite, filet dessous. */
export function Kv({ label, value, last = false }: KvProps) {
  const { c } = useTheme()
  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${value}`}
      style={[s.kv, { borderBottomColor: c.line, borderBottomWidth: last ? 0 : 1 }]}
    >
      <Text style={[s.kvLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[s.kvValue, { color: c.text }]}>{value}</Text>
    </View>
  )
}

export interface MetaProps {
  icon: string
  text: string
  /** Teinte de l'icône (jeton de thème). Le texte reste en `muted`. */
  color?: string
}

/** Élément de la ligne de métadonnées d'une carte : icône + valeur. */
export function Meta({ icon, text, color }: MetaProps) {
  const { c } = useTheme()
  return (
    <View style={s.meta}>
      <Ic name={icon} s={13} c={color ?? c.muted} />
      <Text numberOfLines={1} style={[s.metaTxt, { color: c.muted }]}>{text}</Text>
    </View>
  )
}

export interface ErrorRetryProps {
  message: string
  onRetry: () => void
  /** Seconde ligne d'explication (indice SMTP de la boîte mail). */
  hint?: string
  style?: StyleProp<ViewStyle>
}

/** Échec de chargement : ce qui s'est passé, puis le bouton qui réessaie. */
export function ErrorRetry({ message, onRetry, hint, style }: ErrorRetryProps) {
  const { c } = useTheme()
  return (
    <View style={[s.err, style]}>
      <Banner tone="danger" icon="alert" text={message} />
      {!!hint && <Text style={[s.hint, { color: c.muted }]}>{hint}</Text>}
      <Button label={t('ad.refresh')} icon="refresh" onPress={onRetry} style={s.retry} />
    </View>
  )
}

/** Squelette d'une liste admin — même gabarit que les cartes finales. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
  return <SkeletonList count={count} itemHeight={78} />
}

/** Squelette du tableau de bord : la grille de six chiffres, deux graphiques,
 *  puis les dernières connexions — calqué sur la mise en page réelle. */
export function DashSkeleton() {
  const { c } = useTheme()
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
      <View style={s.grid}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[s.statBox, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width="58%" height={22} />
            <Skeleton width="80%" height={11} />
          </View>
        ))}
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={[s.chartBox, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Skeleton width="52%" height={13} />
          <Skeleton width="100%" height={118} borderRadius={radius.small} />
        </View>
      ))}
      <SkeletonList count={3} itemHeight={62} style={s.logins} />
    </View>
  )
}

const s = StyleSheet.create({
  kv: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11 },
  kvLabel: { fontSize: 13, fontWeight: '600', flexShrink: 0, maxWidth: '46%' },
  kvValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0, flexShrink: 1 },
  metaTxt: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  err: { paddingTop: 4 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  retry: { alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    flexGrow: 1, flexBasis: '46%', minWidth: 0, gap: 8,
    borderWidth: 1, borderRadius: radius.card, padding: 16,
  },
  chartBox: {
    gap: 12, borderWidth: 1, borderRadius: radius.card, padding: 14, marginTop: 12,
  },
  logins: { marginTop: 18 },
})
