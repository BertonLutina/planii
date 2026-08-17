import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Banner, Button, Card, EmptyState, GroupHeader, Ic } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { ErrorRetry, Meta, RowsSkeleton } from './AdminParts'
import { fmtDateTime } from './format'
import type { AAudit } from './types'
import { useAdminList } from './useAdminList'

/* Journal d'audit — portage de `Audit` (planii-vite/src/components/Admin.tsx).
 *
 * C'est la trace des actions destructrices de cet écran : sans elle, « qui a
 * supprimé ce compte ? » n'a pas de réponse. Réservée au super-admin, comme la
 * route `GET /admin/audit`.
 *
 * `GET /admin/audit` renvoie la pagination *et* deux tableaux : `items` (lignes
 * brutes de la base) et `audit` (forme lisible). On lit `audit`. */

const ICON: Record<string, string> = {
  delete_user: 'trash',
  delete_project: 'trash',
  grant_admin: 'shield',
  revoke_admin: 'user',
  task_priority: 'flag',
  mail_sent: 'send',
  mail_reply: 'mail',
}

const LABEL: Record<string, string> = {
  delete_user: 'ad.aDelUser',
  delete_project: 'ad.aDelProj',
  grant_admin: 'ad.aGrant',
  revoke_admin: 'ad.aRevoke',
  task_priority: 'ad.aPrio',
  mail_sent: 'ad.sent',
  mail_reply: 'ad.replySent',
}

export function AuditSection({ padBottom }: { padBottom: number }) {
  const { c } = useTheme()
  const L = useAdminList<AAudit>('/admin/audit', 50, (r) => r.audit ?? r.items)

  const header = (
    <View style={s.tools}>
      {!!L.error && !!L.items?.length && <Banner tone="danger" icon="alert" text={L.error} />}
      <GroupHeader
        title={`${L.items?.length ?? 0}${L.total > (L.items?.length ?? 0) ? ` / ${L.total}` : ''} ${t('ad.actionsCnt')}`}
        style={s.group}
      />
    </View>
  )

  const footer = L.hasMore
    ? (
      <Button
        label={`${t('common.loadMore')} (${L.items?.length ?? 0}/${L.total})`}
        variant="ghost"
        loading={L.loadingMore}
        onPress={L.loadMore}
        style={s.more}
      />
    )
    : null

  if (!L.items && !L.error) return <View style={s.pad}><RowsSkeleton /></View>
  if (!L.items) return <View style={s.pad}><ErrorRetry message={L.error!} onRetry={() => L.load(1, false)} /></View>

  return (
    <FlatList
      data={L.items}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => {
        const label = LABEL[r.action] ? t(LABEL[r.action]) : r.action
        return (
          <Card padded={12} style={s.row}>
            <View style={s.titleRow}>
              <Ic name={ICON[r.action] ?? 'activity'} s={15} c={c.accent} />
              <Text numberOfLines={1} style={[s.title, { color: c.text }]}>{label}</Text>
            </View>
            {!!r.detail && (
              <Text numberOfLines={3} style={[s.detail, { color: c.muted }]}>{r.detail}</Text>
            )}
            <View style={s.meta}>
              <Meta icon="user" text={r.actor} />
              <Meta icon="clock" text={fmtDateTime(r.at)} />
            </View>
          </Card>
        )
      }}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={<EmptyState icon="list" title={t('ad.audit')} message={t('ad.noActions')} />}
      contentContainerStyle={[s.list, { paddingBottom: padBottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={L.refreshing} onRefresh={L.refresh} tintColor={c.accent} colors={[c.accent]} />
      }
    />
  )
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18 },
  tools: { paddingTop: 2 },
  group: { marginTop: 4, marginBottom: 10 },
  row: { marginBottom: 10, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '700' },
  detail: { fontSize: 13, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  more: { marginTop: 6, alignSelf: 'center' },
})
