import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Banner, Button, Field, Ic, Sheet } from '@/components/ui'
import { api } from '@/lib/api'
import { t, trTerm, useI18n } from '@/lib/i18n'
import type { Project, TaskStatus } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { errMsg } from '../lib/flow'

/* Statuts du projet — portage du bloc `status-admin` de la barre latérale du
   web (`POST /projects/:id/task-statuses`, `DELETE …/:key`).
   Le web loge ça dans un filtre de colonne ; sur téléphone il n'y a pas de
   colonne, donc les statuts se gèrent dans leur propre feuille, ouverte depuis
   le menu de l'écran. Les statuts fixes ne sont pas supprimables (même garde).

   La couleur d'un statut vient du serveur : c'est une donnée de contenu, elle
   ne porte donc qu'une pastille — jamais du texte sur fond coloré. */

export interface StatusAdminSheetProps {
  open: boolean
  onClose: () => void
  p: Project
  statuses: TaskStatus[]
  onChanged: () => void
}

export function StatusAdminSheet({ open, onClose, p, statuses, onChanged }: StatusAdminSheetProps) {
  const { c } = useTheme()
  useI18n()
  const [label, setLabel] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) { setLabel(''); setErr(null); setBusy(false) } }, [open])

  async function add() {
    const name = label.trim()
    if (!name) { setErr(t('pd.titleReq')); return }
    setErr(null)
    setBusy(true)
    try {
      await api('POST', '/projects/' + p.id + '/task-statuses', { label: name })
      setLabel('')
      onChanged()
    } catch (e) { setErr(errMsg(e)) }
    finally { setBusy(false) }
  }

  async function remove(key: string) {
    setErr(null)
    try {
      await api('DELETE', '/projects/' + p.id + '/task-statuses/' + encodeURIComponent(key))
      onChanged()
    } catch (e) { setErr(errMsg(e)) }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('meet.status')}
      actions={<Button label={t('action.close')} variant="ghost" onPress={onClose} style={s.grow} />}
    >
      {!!err && <Banner tone="danger" icon="alert" text={err} />}

      <View style={s.list}>
        {statuses.map((st) => (
          <View key={st.key} style={[s.row, { borderColor: c.line, backgroundColor: c.surface }]}>
            <View style={[s.dot, { backgroundColor: st.color }]} />
            <Text numberOfLines={1} style={[s.label, { color: c.text }]}>{trTerm(st.label)}</Text>
            {st.fixed
              ? <Ic name="lock" s={15} c={c.hint} />
              : (
                <Pressable
                  onPress={() => remove(st.key)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('action.delete')} — ${trTerm(st.label)}`}
                  style={s.del}
                >
                  <Ic name="trash" s={16} c={c.danger} />
                </Pressable>
              )}
          </View>
        ))}
      </View>

      <Field
        label={t('action.add')}
        value={label}
        onChangeText={setLabel}
        placeholder="Nouveau statut…"
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={add}
        style={s.field}
      />
      <Button label={t('action.add')} icon="plus" loading={busy} onPress={add} />
    </Sheet>
  )
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  list: { gap: 8, marginBottom: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 46, paddingHorizontal: 12, borderWidth: 1, borderRadius: radius.control,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  del: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  field: { marginTop: 4 },
})
