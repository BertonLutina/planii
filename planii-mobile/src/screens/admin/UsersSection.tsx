import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import {
  Avatar, Banner, Button, Card, Confirm, EmptyState, Field, GroupHeader, Ic, Pill,
} from '@/components/ui'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { User } from '@/lib/types'
import { ChipSelect, type ChipOption } from '@/screens/project/controls/ChipSelect'
import { afterSheet, errMsg, toastAfterSheet, toastErrAfterSheet } from '@/screens/project/lib/flow'
import { useTheme } from '@/theme/ThemeProvider'
import { ErrorRetry, Meta, RowsSkeleton } from './AdminParts'
import { fmtAgo } from './format'
import type { AUser } from './types'
import { useAdminList } from './useAdminList'
import { UserSheet } from './UserSheet'

/* Utilisateurs — portage de `Users` (planii-vite/src/components/Admin.tsx).
 *
 * Le web rend une ligne large : nom, rôle, e-mail, six compteurs, puis deux
 * boutons. Sur un téléphone cette ligne devient une carte à trois informations
 * — qui c'est (avatar + nom + rôle), comment le joindre (e-mail), et son
 * activité (points) — le reste passe dans la fiche. On garde ainsi une ligne
 * scannable de 72 pt au lieu d'un pavé de cinq lignes.
 *
 * La section « Admins » du web (même composant, `adminsOnly`) devient ici un
 * filtre en puces plutôt qu'un sixième onglet : c'est la même liste, filtrée. */

type Scope = 'all' | 'admins'

export interface UsersSectionProps {
  me: User
  isSuper: boolean
  padBottom: number
}

export function UsersSection({ me, isSuper, padBottom }: UsersSectionProps) {
  const { c } = useTheme()
  const L = useAdminList<AUser>('/admin/users', 30)

  const [q, setQ] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [detail, setDetail] = useState<AUser | null>(null)
  const [delFor, setDelFor] = useState<AUser | null>(null)
  const [roleFor, setRoleFor] = useState<AUser | null>(null)
  const [busy, setBusy] = useState(false)

  const adminsOnly = scope === 'admins'

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = L.items ?? []
    if (needle) out = out.filter((u) => (u.name + ' ' + u.email).toLowerCase().includes(needle))
    if (adminsOnly) out = out.filter((u) => u.admin)
    return out
  }, [L.items, q, adminsOnly])

  /* Mêmes droits que le web : jamais soi-même, jamais le super admin, et un
     admin ordinaire ne supprime pas un autre admin. */
  const canDelete = (u: AUser) => u.id !== me.id && !u.superAdmin && (isSuper || !u.admin)
  const canToggleAdmin = (u: AUser) => isSuper && !u.superAdmin

  async function confirmDelete() {
    const u = delFor
    if (!u) return
    setBusy(true)
    try {
      const r = await api<{ deletedProjects: number }>('DELETE', '/admin/users/' + u.id)
      setBusy(false)
      setDelFor(null)
      toastAfterSheet(
        t('ad.deleted', { n: u.name })
        + (r.deletedProjects ? ' ' + t('ad.plusProjects', { n: r.deletedProjects }) : ''),
      )
      L.load(1, false)
    } catch (e) {
      setBusy(false)
      setDelFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }

  async function confirmRole() {
    const u = roleFor
    if (!u) return
    setBusy(true)
    try {
      await api('PATCH', `/admin/users/${u.id}/admin`, { admin: !u.admin })
      setBusy(false)
      setRoleFor(null)
      toastAfterSheet(u.admin ? t('ad.roleRevoked', { n: u.name }) : t('ad.nowAdmin', { n: u.name }))
      L.load(1, false)
    } catch (e) {
      setBusy(false)
      setRoleFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }

  const scopes: ChipOption<Scope>[] = [
    { key: 'all', label: t('ad.users'), tone: 'accent' },
    { key: 'admins', label: t('ad.admins'), tone: 'accent' },
  ]

  const header = (
    <View style={s.tools}>
      {!!L.error && !!L.items?.length && <Banner tone="danger" icon="alert" text={L.error} />}
      <Field
        placeholder={adminsOnly ? t('ad.searchAdmin') : t('ad.searchUser')}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        returnKeyType="search"
        style={s.search}
      />
      {isSuper && <ChipSelect options={scopes} value={scope} onChange={setScope} style={s.chips} />}
      <GroupHeader
        title={`${list.length}${L.total > list.length ? ` / ${L.total}` : ''} ${adminsOnly ? t('ad.adminsCnt') : t('ad.usersCnt')}`}
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
    <View style={s.fill}>
      <FlatList
        data={list}
        keyExtractor={(u) => u.id}
        renderItem={({ item: u }) => (
          <Card
            padded={12}
            onPress={() => setDetail(u)}
            accessibilityLabel={
              `${u.name}${u.superAdmin ? ', ' + t('ad.superAdmin') : u.admin ? ', ' + t('ad.admin') : ''}`
              + `, ${u.email}, ${u.points} pts, ${t('ad.seen')} ${fmtAgo(u.lastLogin)}`
            }
            style={s.row}
          >
            <View style={s.rowInner}>
              <Avatar name={u.name} size={38} />
              <View style={s.body}>
                <View style={s.titleRow}>
                  <Text numberOfLines={1} style={[s.name, { color: c.text }]}>{u.name}</Text>
                  {(u.superAdmin || u.admin) && (
                    <Pill label={u.superAdmin ? t('ad.superAdmin') : t('ad.admin')} tone="accent" />
                  )}
                </View>
                <Text numberOfLines={1} style={[s.mail, { color: c.muted }]}>{u.email}</Text>
                <View style={s.meta}>
                  <Meta icon="trophy" text={`${u.points} pts`} color={c.gold} />
                  <Meta icon="clock" text={fmtAgo(u.lastLogin)} />
                </View>
              </View>
              <Ic name="chevron-right" s={18} c={c.hint} />
            </View>
          </Card>
        )}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          q.trim()
            ? <EmptyState icon="search" title={t('cmd.noResult')} message={t('ad.searchUser')} />
            : (
              <EmptyState
                icon={adminsOnly ? 'shield' : 'users'}
                title={adminsOnly ? t('ad.admins') : t('ad.users')}
                message={adminsOnly ? t('ad.noAdmins') : t('g.admin.p2')}
              />
            )
        }
        contentContainerStyle={[s.list, { paddingBottom: padBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={L.refreshing} onRefresh={L.refresh} tintColor={c.accent} colors={[c.accent]} />
        }
      />

      <UserSheet
        open={!!detail}
        user={detail}
        onClose={() => setDetail(null)}
        canToggleAdmin={!!detail && canToggleAdmin(detail)}
        canDelete={!!detail && canDelete(detail)}
        onToggleAdmin={() => { const u = detail; setDetail(null); afterSheet(() => setRoleFor(u)) }}
        onDelete={() => { const u = detail; setDetail(null); afterSheet(() => setDelFor(u)) }}
      />

      {/* Donner ou retirer le rôle admin ouvre (ou ferme) tout cet espace :
          on annonce la conséquence avant de la produire. */}
      <Confirm
        open={!!roleFor}
        onClose={() => setRoleFor(null)}
        title={roleFor?.admin ? `${t('ad.revokeAdmin')} ?` : `${t('ad.makeAdmin')} ?`}
        message={roleFor
          ? `« ${roleFor.name} » (${roleFor.email})`
            + (roleFor.admin ? '' : ` — ${t('g.admin.intro')}`)
          : undefined}
        confirmLabel={roleFor?.admin ? t('ad.revokeAdmin') : t('ad.makeAdmin')}
        tone={roleFor?.admin ? 'danger' : 'accent'}
        loading={busy}
        onConfirm={confirmRole}
      />

      {/* Suppression. Le web ne pose aucune phrase ici (deux boutons en ligne) ;
          sur mobile la confirmation nomme au moins la cible et son caractère
          définitif. Le nombre de projets réellement supprimés n'est connu qu'au
          retour du serveur : il part dans le message de succès, mot pour mot
          comme le web (`ad.deleted` + `ad.plusProjects`). */}
      <Confirm
        open={!!delFor}
        onClose={() => setDelFor(null)}
        title={delFor ? `${t('action.delete')} « ${delFor.name} » ?` : t('action.delete')}
        message={delFor ? `${delFor.email} — ${t('pd.irrev')}` : undefined}
        confirmLabel={t('pd.yesDel')}
        tone="danger"
        loading={busy}
        onConfirm={confirmDelete}
      />
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 18 },
  list: { paddingHorizontal: 18 },
  tools: { paddingTop: 2 },
  search: { marginBottom: 10 },
  chips: { marginBottom: 2 },
  group: { marginTop: 4, marginBottom: 10 },
  row: { marginBottom: 10 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  mail: { fontSize: 12.5 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  more: { marginTop: 6, alignSelf: 'center' },
})
