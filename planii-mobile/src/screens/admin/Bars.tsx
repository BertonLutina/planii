import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Card } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Graphique à barres natif — portage de `VBars` et de `.spark`
   (planii-vite/src/components/Admin.tsx).

   Pas de bibliothèque de graphiques : trois histogrammes de six, trois et
   quatorze valeurs se font avec des `View`, et une dépendance de plus coûterait
   plus cher que ces quarante lignes.

   Le web pose l'information dans un `title=` au survol : sur un téléphone,
   personne ne survole rien. Chaque colonne est donc un élément accessible qui
   énonce sa valeur (« P1 : 12 tâches »), et — hors mode compact — la porte
   aussi en clair au-dessus de la barre. La couleur ne dit jamais rien à elle
   seule : le libellé sous la barre et le nombre au-dessus la doublent. */

export interface BarDatum {
  key: string
  /** Libellé court sous la barre (masqué en mode compact). */
  label: string
  value: number
  /** Couleur de remplissage — toujours un jeton de thème, jamais un littéral. */
  color?: string
  /** Phrase lue par le lecteur d'écran : « P1 : 12 tâches ». */
  a11y: string
}

export interface BarsProps {
  title: string
  data: BarDatum[]
  /** Barres fines sans nombre ni libellé (série de 14 jours). */
  compact?: boolean
  /** Trois repères sous le graphique — début, total, fin. */
  footer?: [string, string, string]
  style?: StyleProp<ViewStyle>
}

export function Bars({ title, data, compact = false, footer, style }: BarsProps) {
  const { c } = useTheme()
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <Card padded={14} style={style}>
      <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>{title}</Text>

      <View style={[s.row, { height: compact ? 92 : 118 }]}>
        {data.map((d) => {
          /* Une valeur non nulle garde au moins 6 % de hauteur : sinon une
             barre à 1 sur 400 disparaît alors que la donnée existe. */
          const pct = d.value > 0 ? Math.max(6, Math.round((d.value / max) * 100)) : 0
          return (
            <View
              key={d.key}
              accessible
              accessibilityRole="text"
              accessibilityLabel={d.a11y}
              style={[s.col, compact && s.colTight]}
            >
              {!compact && (
                <Text numberOfLines={1} style={[s.val, { color: c.text }]}>{d.value}</Text>
              )}
              <View style={[s.track, { backgroundColor: c.surface2 }]}>
                <View
                  style={[
                    s.fill,
                    { height: `${pct}%`, backgroundColor: d.color ?? c.accent },
                  ]}
                />
              </View>
              {!compact && (
                <Text numberOfLines={1} style={[s.lbl, { color: c.muted }]}>{d.label}</Text>
              )}
            </View>
          )
        })}
      </View>

      {!!footer && (
        <View style={s.foot}>
          <Text style={[s.footTxt, { color: c.hint }]}>{footer[0]}</Text>
          <Text style={[s.footTxt, s.footMid, { color: c.muted }]}>{footer[1]}</Text>
          <Text style={[s.footTxt, s.footEnd, { color: c.hint }]}>{footer[2]}</Text>
        </View>
      )}
    </Card>
  )
}

const s = StyleSheet.create({
  title: { fontSize: 13.5, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  col: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5, height: '100%' },
  colTight: { gap: 0 },
  val: { fontSize: 12, fontWeight: '800' },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: radius.flag, overflow: 'hidden' },
  fill: { width: '100%', borderRadius: radius.flag },
  lbl: { fontSize: 11, fontWeight: '600' },
  foot: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  footTxt: { flex: 1, fontSize: 11.5, fontWeight: '600' },
  footMid: { textAlign: 'center' },
  footEnd: { textAlign: 'right' },
})
