import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Banner, Card, GroupHeader, Pill, SectionHeader, Sheet, Switch } from '@/components/ui'
import { api } from '@/lib/api'
import { t } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { DEFAULT_EMAIL_NOTIFS, emailNotifsOf, type EmailNotifKey, type User } from '@/lib/types'
import { useTheme } from '@/theme/ThemeProvider'

/* Notifications e-mail — portage de `EmailNotifsModal` (planii-vite/src/App.tsx).
   Mêmes sections, mêmes clés, même PATCH partiel `{ emailNotifs: { clé: bool } }`.
   Les erreurs restent dans la feuille (bandeau) : un toast serait masqué par la
   fenêtre modale. */

/** Clés réservées aux admin / super-admin. */
const ADMIN_ONLY = new Set<EmailNotifKey>(['invNewAdmin'])

const SECTIONS: { titleKey: string; keys: EmailNotifKey[] }[] = [
  { titleKey: 'profile.emailNotifsTasks', keys: ['tAssign', 'tAssignMgr', 'tNew', 'remind', 'late', 'lateMgr', 'relance'] },
  { titleKey: 'profile.emailNotifsAppts', keys: ['apptNew', 'apptUpd'] },
  { titleKey: 'profile.emailNotifsInvites', keys: ['invNew', 'invNewAdmin', 'welcome', 'joined'] },
]

const visibleKeys = (isAdmin: boolean): EmailNotifKey[] =>
  SECTIONS.flatMap((sec) => sec.keys.filter((k) => isAdmin || !ADMIN_ONLY.has(k)))

export function EmailNotifsSection({ me }: { me: User }) {
  const { c } = useTheme()
  const [open, setOpen] = useState(false)

  const isAdmin = !!(me.admin || me.superAdmin)
  const prefs = emailNotifsOf(me.emailNotifs)
  const keys = visibleKeys(isAdmin)
  const on = keys.filter((k) => prefs[k]).length

  return (
    <>
      <SectionHeader title={t('profile.emailNotifs')} actionLabel={t('action.edit')} onAction={() => setOpen(true)} />
      <Card>
        <Text style={[s.desc, { color: c.muted }]}>{t('profile.emailNotifsDesc')}</Text>
        <Pill
          label={`${on} / ${keys.length} activées`}
          tone={on === 0 ? 'neutral' : on === keys.length ? 'ok' : 'accent'}
          style={s.pill}
        />
      </Card>
      <EmailNotifsSheet me={me} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function EmailNotifsSheet({ me, open, onClose }: { me: User; open: boolean; onClose: () => void }) {
  const { c } = useTheme()
  const { update } = useSession()
  const [busy, setBusy] = useState<EmailNotifKey | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const isAdmin = !!(me.admin || me.superAdmin)
  const prefs = emailNotifsOf(me.emailNotifs)

  /* Premier passage : persiste tout à ON si rien n'a encore été enregistré,
     pour que l'affichage et le serveur disent la même chose. */
  useEffect(() => {
    if (!open) return
    const stored = me.emailNotifs
    if (stored && Object.keys(stored).length > 0) return
    let cancelled = false
    api<{ user: User }>('PATCH', '/me', { emailNotifs: DEFAULT_EMAIL_NOTIFS })
      .then((r) => { if (!cancelled) update(r.user) })
      .catch(() => { /* l'UI affiche déjà tout à ON */ })
    return () => { cancelled = true }
  }, [open, me.emailNotifs, update])

  async function toggle(key: EmailNotifKey) {
    if (busy) return
    if (ADMIN_ONLY.has(key) && !isAdmin) return
    setErr(null)
    setBusy(key)
    try {
      const r = await api<{ user: User }>('PATCH', '/me', { emailNotifs: { [key]: !prefs[key] } })
      update(r.user)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('profile.emailNotifs')}>
      <Text style={[s.desc, { color: c.muted }]}>{t('profile.emailNotifsDesc')}</Text>
      {!!err && <Banner tone="danger" icon="alert" text={err} style={s.banner} />}
      {SECTIONS.map((sec) => {
        const keys = sec.keys.filter((k) => isAdmin || !ADMIN_ONLY.has(k))
        if (!keys.length) return null
        return (
          <View key={sec.titleKey}>
            <GroupHeader title={t(sec.titleKey)} />
            <Card padded={false}>
              {keys.map((key, i) => (
                <View
                  key={key}
                  style={[s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}
                >
                  <Text style={[s.rowLabel, { color: c.text }]}>{t('profile.mail.' + key)}</Text>
                  <Switch
                    value={prefs[key]}
                    onValueChange={() => toggle(key)}
                    disabled={busy === key}
                    accessibilityLabel={t('profile.mail.' + key)}
                  />
                </View>
              ))}
            </Card>
          </View>
        )
      })}
    </Sheet>
  )
}

const s = StyleSheet.create({
  desc: { fontSize: 13.5, lineHeight: 19 },
  pill: { marginTop: 10 },
  banner: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 16, paddingVertical: 10 },
  rowLabel: { flex: 1, fontSize: 14.5, lineHeight: 19 },
})
