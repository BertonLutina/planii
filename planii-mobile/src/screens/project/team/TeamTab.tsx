import { useCallback, useState } from 'react'
import { FlatList, Share, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import {
  Avatar, Banner, Button, Card, Chip, ProgressBar, SectionHeader, toast, toastErr,
} from '@/components/ui'
import { MicField } from '@/components/Mic'
import { api } from '@/lib/api'
import { canManage, INVITE_ROLES, ROLE_LABEL } from '@/lib/dates'
import { t, useI18n } from '@/lib/i18n'
import { levelOf, memberPoints, projectPoints } from '@/lib/points'
import { roleLibraryOf, typeTone } from '@/lib/tasktype'
import type { Member, Project, User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { errMsg, toastAfterSheet, toastErrAfterSheet } from '../lib/flow'
import { RolesSheet } from './RolesSheet'

/* Onglet « Équipe » — fusion des onglets `equipe` (tableau des points) et
   `membres` (rôles + invitations) du web.

   Le web garde deux onglets parce qu'il a la largeur pour un tableau de
   colonnes par personne ; ici les deux parlent des mêmes gens, et la liste des
   tâches d'un membre est déjà l'onglet « Tâches », groupé par responsable.
   Une seule liste donc : chaque membre porte son score, son niveau et ses
   rôles. L'administration des rôles et les invitations encadrent la liste. */

export interface TeamTabProps {
  p: Project
  me: User
  reload: () => void
}

interface InviteLink { role: string; link: string }

export function TeamTab({ p, me, reload }: TeamTabProps) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  useI18n()

  const [newRole, setNewRole] = useState('')
  const [roleErr, setRoleErr] = useState<string | null>(null)
  const [roleBusy, setRoleBusy] = useState(false)
  const [assignFor, setAssignFor] = useState<Member | null>(null)
  const [assignBusy, setAssignBusy] = useState(false)
  const [links, setLinks] = useState<InviteLink[]>([])

  const closed = p.status === 'done'
  const manage = canManage(p.my_role)
  const roles = p.roles ?? []
  const suggestions = roleLibraryOf(me).filter((r) => !roles.some((x) => x.name.toLowerCase() === r.toLowerCase()))

  const addRole = useCallback(async (name?: string) => {
    const nm = (name ?? newRole).trim()
    if (!nm) { setRoleErr(t('pd.titleReq')); return }
    setRoleErr(null)
    setRoleBusy(true)
    try {
      await api('POST', '/projects/' + p.id + '/roles', { name: nm })
      if (!name) setNewRole('')
      toast(t('msg.saved'))
      reload()
    } catch (e) { setRoleErr(errMsg(e)) }
    finally { setRoleBusy(false) }
  }, [newRole, p.id, reload])

  const delRole = useCallback(async (id: string) => {
    try { await api('DELETE', '/projects/' + p.id + '/roles/' + id); reload() }
    catch (e) { toastErr(errMsg(e)) }
  }, [p.id, reload])

  const saveAssign = useCallback(async (roleIds: string[]) => {
    const m = assignFor
    if (!m) return
    setAssignBusy(true)
    try {
      await api('PUT', '/projects/' + p.id + '/members/' + m.id + '/roles', { roleIds })
      setAssignBusy(false)
      setAssignFor(null)
      toastAfterSheet(t('pd.rolesOk'))
      reload()
    } catch (e) {
      setAssignBusy(false)
      setAssignFor(null)
      toastErrAfterSheet(errMsg(e))
    }
  }, [assignFor, p.id, reload])

  const invite = useCallback(async (role: string) => {
    try {
      const r = await api<InviteLink>('POST', '/projects/' + p.id + '/invites', { role })
      setLinks((l) => [r, ...l])
      toast(t('pd.inviteMade'))
    } catch (e) { toastErr(errMsg(e)) }
  }, [p.id])

  const copy = useCallback((link: string) => {
    Clipboard.setStringAsync(link)
      .then(() => toast(t('pd.linkCopied')))
      .catch(() => toastErr(t('pd.copyUnavail')))
  }, [])

  const share = useCallback((link: string) => {
    Share.share({ message: link }).catch(() => { /* annulé */ })
  }, [])

  const header = (
    <View>
      <Banner tone="accent" icon="star" text={`${t('lb.scale')} · ${projectPoints(p)} pts`} />

      {manage && !closed && (
        <>
          <SectionHeader title={t('pd.projRoles')} />
          <Card>
            <View style={s.chips}>
              {roles.length === 0
                ? <Text style={[s.muted, { color: c.muted }]}>{t('pd.noRoles')}</Text>
                : roles.map((r) => (
                  <Chip key={r.id} label={r.name} tone={typeTone(r.name)} onRemove={() => delRole(r.id)} />
                ))}
            </View>
            <MicField
              value={newRole}
              onChangeText={(v) => { setRoleErr(null); setNewRole(v) }}
              placeholder={t('profile.newRole')}
              maxLength={40}
              error={roleErr}
              returnKeyType="done"
              onSubmitEditing={() => addRole()}
              style={s.roleField}
            />
            <Button label={t('action.add')} icon="plus" size="sm" loading={roleBusy} onPress={() => addRole()} />

            {suggestions.length > 0 && (
              <>
                <Text style={[s.muted, s.libTitle, { color: c.muted }]}>{t('pd.fromLib')}</Text>
                <View style={s.chips}>
                  {suggestions.map((r) => (
                    <Chip key={r} label={`＋ ${r}`} tone="neutral" onPress={() => addRole(r)} />
                  ))}
                </View>
              </>
            )}
          </Card>
        </>
      )}

      <SectionHeader title={`${t('proj.thMembers')} (${p.members.length})`} />
    </View>
  )

  const footer = manage && !closed
    ? (
      <View>
        <SectionHeader title={t('pd.invite')} />
        <Banner tone="accent" icon="info" text={t('pd.inviteBanner')} />
        <View style={s.chips}>
          {(INVITE_ROLES[p.type] ?? []).map(([role, label]) => (
            <Button
              key={role}
              label={`${t('pd.linkBtn')} ${label}`}
              icon="user-plus"
              size="sm"
              onPress={() => invite(role)}
            />
          ))}
        </View>

        {links.map((lk, i) => (
          <Card key={lk.link + i} style={s.linkCard}>
            <Text style={[s.muted, { color: c.muted }]}>
              {t('pd.invitation')} · {ROLE_LABEL[lk.role] || lk.role}
            </Text>
            <Text numberOfLines={2} style={[s.link, { color: c.text, backgroundColor: c.surface2 }]}>{lk.link}</Text>
            <View style={s.linkBtns}>
              <Button label={t('pd.copy')} icon="copy" size="sm" variant="primary" onPress={() => copy(lk.link)} />
              <Button label={t('meet.send')} icon="send" size="sm" onPress={() => share(lk.link)} />
            </View>
          </Card>
        ))}
      </View>
    )
    : null

  return (
    <View style={s.fill}>
      <FlatList
        data={p.members}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: m }) => {
          const pts = memberPoints(p, m.id)
          const lv = levelOf(pts)
          const mine = m.id === me.id
          return (
            <View style={[s.row, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Avatar name={m.name} size={38} />
              <View style={s.body}>
                <Text numberOfLines={1} style={[s.name, { color: c.text }]}>
                  {m.name}{mine ? ` ${t('vw.me')}` : ''}
                </Text>
                <Text numberOfLines={1} style={[s.sub, { color: c.muted }]}>
                  {m.email} · {ROLE_LABEL[m.role] || m.role}{m.job ? ` · ${m.job}` : ''}
                </Text>
                {!!m.roleIds?.length && (
                  <View style={s.roleChips}>
                    {m.roleIds.map((rid) => {
                      const name = roles.find((r) => r.id === rid)?.name
                      return name ? <Chip key={rid} label={name} tone={typeTone(name)} /> : null
                    })}
                  </View>
                )}
                <View style={s.score}>
                  <Text style={[s.pts, { color: c.text }]}>{pts} pts</Text>
                  <Text style={[s.sub, { color: c.muted }]}>{lv.medal} {t('lb.level')} {lv.level}</Text>
                </View>
                <ProgressBar
                  value={lv.into}
                  total={lv.per}
                  height={5}
                  accessibilityLabel={`${t('lb.level')} ${lv.level} — ${lv.into}/${lv.per}`}
                  style={s.bar}
                />
                {/* `setMemberRoles` passe par `assertProjectOpen` : sur un projet
                    clôturé le serveur renverrait 423. */}
                {manage && !closed && roles.length > 0 && (
                  <Button label={t('pd.roles')} icon="shield" size="sm" variant="ghost" onPress={() => setAssignFor(m)} style={s.rolesBtn} />
                )}
              </View>
            </View>
          )
        }}
      />

      <RolesSheet
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        member={assignFor}
        roles={roles}
        busy={assignBusy}
        onSave={saveAssign}
      />
    </View>
  )
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: 18, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { fontSize: 13, lineHeight: 18 },
  libTitle: { marginTop: 14, marginBottom: 8 },
  roleField: { marginTop: 12, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderRadius: radius.card, padding: 13, marginBottom: 10,
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15.5, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 2 },
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 9 },
  pts: { fontSize: 15, fontWeight: '800' },
  bar: { marginTop: 6 },
  rolesBtn: { marginTop: 10, alignSelf: 'flex-start' },
  linkCard: { marginTop: 12, gap: 8 },
  link: { fontSize: 12.5, padding: 10, borderRadius: radius.small },
  linkBtns: { flexDirection: 'row', gap: 8 },
})
