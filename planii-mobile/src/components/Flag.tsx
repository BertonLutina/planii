import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native'

/** Drapeau PNG (flagcdn) — les emoji 🇫🇷 ne s'affichent pas sur Android. */
export function Flag({ code, size = 22, style }: { code: string; size?: number; style?: StyleProp<ImageStyle> }) {
  const iso = String(code || '').toLowerCase()
  if (!iso) return <View style={{ width: size * 1.4, height: size, borderRadius: 2, backgroundColor: '#ddd' } as ViewStyle} />
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri: `https://flagcdn.com/w80/${iso}.png` }}
      style={[{ width: size * 1.4, height: size, borderRadius: 2 }, style]}
      resizeMode="cover"
    />
  )
}

/** Code langue Planii → code ISO drapeau. */
export const LANG_FLAG: Record<string, string> = {
  fr: 'fr',
  en: 'gb',
  nl: 'nl',
  es: 'es',
  pt: 'pt',
  it: 'it',
  el: 'gr',
  ru: 'ru',
  sw: 'tz',
}
