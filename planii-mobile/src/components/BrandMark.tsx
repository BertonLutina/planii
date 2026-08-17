import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * Marque Planii — trois barres alignées, la deuxième évidée.
 * Géométrie identique à `brand/svg/planii-mark.svg` (grille de 100 unités).
 *
 * `simplified` : en dessous d'environ 48 px, le trou de la barre évidée mesure
 * moins d'un pixel et se referme. On le remplace alors par un aplat à 55 % :
 * la hiérarchie à trois niveaux survit, seul le moyen change.
 */
export function BrandMark({ size = 24, color = '#fff', simplified }: {
  size?: number
  color?: string
  simplified?: boolean
}) {
  const small = simplified ?? size < 48
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x={12} y={10} width={58} height={21} rx={10.5} fill={color} />
      {small
        ? <Rect x={12} y={39.5} width={76} height={21} rx={10.5} fill={color} opacity={0.55} />
        : <Rect x={15.5} y={43} width={69} height={14} rx={7} fill="none" stroke={color} strokeWidth={7} />}
      <Rect x={12} y={69} width={40} height={21} rx={10.5} fill={color} />
    </Svg>
  )
}

/**
 * La marque blanche sur la tuile dégradée — l'équivalent natif de `.logo-big`
 * du web. Le dégradé reprend `--grad-accent` : #8b7bff → #6d5cff à 135°.
 */
export function BrandTile({ size = 72, radius, simplified, style }: {
  size?: number
  radius?: number
  /** Force la variante. Par défaut : évidement au-dessus de 48 px de marque. */
  simplified?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const r = radius ?? Math.round(size * 0.29) // ~ squircle iOS
  const small = simplified ?? size * 0.66 < 48
  return (
    <View style={[{ width: size, height: size, borderRadius: r, overflow: 'hidden' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="planiiTile" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8b7bff" />
            <Stop offset="1" stopColor="#6d5cff" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill="url(#planiiTile)" />
        {/* marque à 66 % de la tuile, centrée — même proportion que l'icône d'app */}
        <Rect x={12 * 0.66 + 17} y={10 * 0.66 + 17} width={58 * 0.66} height={21 * 0.66} rx={10.5 * 0.66} fill="#fff" />
        {small
          ? <Rect x={12 * 0.66 + 17} y={39.5 * 0.66 + 17} width={76 * 0.66} height={21 * 0.66} rx={10.5 * 0.66} fill="#fff" opacity={0.55} />
          : <Rect x={15.5 * 0.66 + 17} y={43 * 0.66 + 17} width={69 * 0.66} height={14 * 0.66} rx={7 * 0.66} fill="none" stroke="#fff" strokeWidth={7 * 0.66} />}
        <Rect x={12 * 0.66 + 17} y={69 * 0.66 + 17} width={40 * 0.66} height={21 * 0.66} rx={10.5 * 0.66} fill="#fff" />
      </Svg>
    </View>
  )
}
