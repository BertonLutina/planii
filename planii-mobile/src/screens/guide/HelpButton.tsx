import { useState } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ic, Sheet } from '@/components/ui'
import { t, useI18n } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Guide — portage de `Guide` (planii-vite/src/components/Guide.tsx).
   Le web pose une modale d'aide *puis* une visite guidée en « coach marks »
   posée sur le DOM (querySelector + getBoundingClientRect). Rien de tout cela
   n'existe en natif, et empiler une seconde couche modale au-dessus d'une
   feuille est interdit ici. On garde donc la même copie — intro, points,
   étapes — dans une seule feuille : les étapes deviennent une liste numérotée
   qui se lit au lieu de se survoler. */

export type GuideTab = 'accueil' | 'projets' | 'calendrier' | 'classement' | 'profil' | 'admin'

/** Nombre de points et d'étapes par page — même structure que `GUIDE_DEF` du web.
 *  Les textes viennent d'i18n (`g.<page>.p1…`, `g.<page>.s1t` / `s1x`). */
const GUIDE_DEF: Record<GuideTab, { pts: number; steps: number }> = {
  accueil: { pts: 4, steps: 4 },
  projets: { pts: 4, steps: 4 },
  calendrier: { pts: 3, steps: 2 },
  classement: { pts: 3, steps: 2 },
  profil: { pts: 3, steps: 1 },
  admin: { pts: 3, steps: 1 },
}

const isTab = (v: string): v is GuideTab => v in GUIDE_DEF

export interface HelpButtonProps {
  /** Page concernée : 'accueil' | 'projets' | 'calendrier' | 'classement' | 'profil' | 'admin'. */
  tab: GuideTab | (string & {})
  style?: StyleProp<ViewStyle>
}

/** Bouton d'aide de l'en-tête. Autonome : il ouvre lui-même sa feuille.
 *  Rend `null` si la page n'a pas de guide — même contrat que le web. */
export function HelpButton({ tab, style }: HelpButtonProps) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)
  useI18n()

  if (!isTab(String(tab))) return null
  const key = String(tab) as GuideTab
  const def = GUIDE_DEF[key]

  const points = Array.from({ length: def.pts }, (_, i) => t(`g.${key}.p${i + 1}`))
  const steps = Array.from({ length: def.steps }, (_, i) => ({
    title: t(`g.${key}.s${i + 1}t`),
    text: t(`g.${key}.s${i + 1}x`),
  }))

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('common.help')}
        hitSlop={8}
        style={({ pressed }) => [
          s.btn,
          { borderColor: c.line, backgroundColor: pressed ? c.surface2 : c.surface },
          style,
        ]}
      >
        <Ic name="help" s={19} c={c.muted} />
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={t(`g.${key}.title`)}>
        <Text style={[s.intro, { color: c.muted }]}>{t(`g.${key}.intro`)}</Text>

        <View style={s.list}>
          {points.map((p, i) => (
            <View key={`p${i}`} style={s.point}>
              <View style={[s.tick, { backgroundColor: c.accentBg }]}>
                <Ic name="check" s={13} c={c.accent} strokeWidth={2.4} />
              </View>
              <Text style={[s.pointTxt, { color: c.text }]}>{p}</Text>
            </View>
          ))}
        </View>

        {steps.length > 0 && (
          <>
            <Text style={[s.head, { color: c.muted }]}>{t('guide.launch').toUpperCase()}</Text>
            <View style={s.list}>
              {steps.map((st, i) => (
                <View key={`s${i}`} style={s.step}>
                  <View style={[s.num, { backgroundColor: c.accentBg }]}>
                    <Text style={[s.numTxt, { color: c.accentOn }]}>{i + 1}</Text>
                  </View>
                  <View style={s.stepBody}>
                    <Text style={[s.stepTitle, { color: c.text }]}>{st.title}</Text>
                    <Text style={[s.stepTxt, { color: c.muted }]}>{st.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </Sheet>
    </>
  )
}

const s = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { fontSize: 14.5, lineHeight: 21 },
  list: { gap: 12, marginTop: 14 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  pointTxt: { flex: 1, fontSize: 14, lineHeight: 20 },
  head: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 22 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  num: { width: 22, height: 22, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numTxt: { fontSize: 12, fontWeight: '800' },
  stepBody: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 14.5, fontWeight: '700' },
  stepTxt: { fontSize: 13.5, lineHeight: 19 },
})
