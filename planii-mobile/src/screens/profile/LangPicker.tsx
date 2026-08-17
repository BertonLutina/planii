import { StyleSheet } from 'react-native'
import { Card, SelectBox } from '@/components/ui'
import { langOptions, t, useI18n } from '@/lib/i18n'

/** Langue du profil — list box avec drapeaux. */
export function LangPicker() {
  const { lang, setLang } = useI18n()

  return (
    <Card padded style={s.card}>
      <SelectBox
        label={t('lang.title')}
        value={lang}
        options={langOptions()}
        onChange={(code) => setLang(code as typeof lang)}
        searchable={false}
        style={s.select}
      />
    </Card>
  )
}

const s = StyleSheet.create({
  card: { paddingTop: 14, paddingBottom: 4 },
  select: { marginBottom: 4 },
})
