import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Banner, Card, EmptyState, Fab, GroupHeader, Pill } from '@/components/ui'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { errMsg } from '@/screens/project/lib/flow'
import { useTheme } from '@/theme/ThemeProvider'
import { ErrorRetry, RowsSkeleton } from './AdminParts'
import { fmtDateTime } from './format'
import { ComposeSheet, MailSheet } from './MailSheets'
import type { MailItem, MailMsg } from './types'

/* Boîte mail — portage de `Mailbox` (planii-vite/src/components/Admin.tsx).
 * Réservée au super-admin, comme les routes `/admin/mail*`.
 *
 * Liste → feuille de lecture → réponse, dans cet ordre et jamais empilés. La
 * feuille s'ouvre dès l'appui, avec un squelette, puis se remplit : attendre
 * l'IMAP écran figé donnerait l'impression d'un appui perdu.
 *
 * `GET /admin/mail` renvoie `{ messages, mailbox }` — pas de pagination (le
 * serveur coupe à 30), donc pas de bouton « charger plus » ici, seulement le
 * tiré-pour-rafraîchir.
 *
 * Un message non lu est marqué par une pastille « Nouveau » : le web se
 * contente d'un point coloré et d'une graisse, ce qui ne se lit pas au lecteur
 * d'écran. */

export function MailSection({ padBottom }: { padBottom: number }) {
  const { c } = useTheme()

  const [items, setItems] = useState<MailItem[] | null>(null)
  const [mailbox, setMailbox] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [openUid, setOpenUid] = useState<number | null>(null)
  const [msg, setMsg] = useState<MailMsg | null>(null)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [compose, setCompose] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api<{ messages: MailItem[]; mailbox: string }>('GET', '/admin/mail')
      setItems(r.messages ?? [])
      setMailbox(r.mailbox ?? '')
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = useCallback(() => {
    setRefreshing(true)
    load().finally(() => setRefreshing(false))
  }, [load])

  const openMsg = useCallback(async (uid: number) => {
    setOpenUid(uid)
    setMsg(null)
    setMsgError(null)
    try {
      const r = await api<{ message: MailMsg }>('GET', '/admin/mail/' + uid)
      setMsg(r.message)
    } catch (e) {
      setMsgError(errMsg(e))
    }
  }, [])

  const closeMsg = useCallback(() => {
    setOpenUid(null)
    setMsg(null)
    setMsgError(null)
  }, [])

  if (!items && !error) return <View style={s.pad}><RowsSkeleton count={5} /></View>
  if (!items) {
    return (
      <View style={s.pad}>
        <ErrorRetry message={error!} hint={t('ad.smtpHint')} onRetry={load} />
      </View>
    )
  }

  const header = (
    <View style={s.tools}>
      {!!error && <Banner tone="danger" icon="alert" text={error} />}
      <GroupHeader
        title={`${items.length} ${t('ad.msgsCnt')}${mailbox ? ' — ' + mailbox : ''}`}
        style={s.group}
      />
    </View>
  )

  return (
    <View style={s.fill}>
      <FlatList
        data={items}
        keyExtractor={(m) => String(m.uid)}
        renderItem={({ item: m }) => (
          <Card
            padded={12}
            onPress={() => openMsg(m.uid)}
            accessibilityLabel={
              `${m.seen ? '' : t('action.new') + ', '}${m.fromName || m.from}`
              + `, ${m.subject}, ${fmtDateTime(m.date)}`
            }
            style={s.row}
          >
            <View style={s.titleRow}>
              <Text
                numberOfLines={1}
                style={[s.from, { color: c.text, fontWeight: m.seen ? '600' : '800' }]}
              >
                {m.fromName || m.from}
              </Text>
              {!m.seen && <Pill label={t('action.new')} tone="accent" />}
            </View>
            <Text numberOfLines={2} style={[s.subject, { color: m.seen ? c.muted : c.text }]}>
              {m.subject}
            </Text>
            <Text style={[s.date, { color: c.hint }]}>{fmtDateTime(m.date)}</Text>
          </Card>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="inbox"
            title={t('ad.mail')}
            message={t('ad.emptyBox')}
            actionLabel={t('ad.write')}
            onAction={() => setCompose(true)}
          />
        }
        contentContainerStyle={[s.list, { paddingBottom: padBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />
        }
      />

      {/* Dernier enfant du conteneur `flex: 1` — jamais dans une liste. */}
      <Fab
        onPress={() => setCompose(true)}
        accessibilityLabel={t('ad.compose')}
        icon="edit"
        tabBarHeight={0}
      />

      <MailSheet
        open={openUid !== null}
        msg={msg}
        error={msgError}
        onClose={closeMsg}
        onRetry={() => { if (openUid !== null) openMsg(openUid) }}
        onReplied={load}
      />

      <ComposeSheet open={compose} onClose={() => setCompose(false)} onSent={load} />
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18 },
  tools: { paddingTop: 2 },
  group: { marginTop: 4, marginBottom: 10 },
  row: { marginBottom: 10, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  from: { flex: 1, minWidth: 0, fontSize: 14.5 },
  subject: { fontSize: 13.5, lineHeight: 19 },
  date: { fontSize: 12, fontWeight: '600' },
})
