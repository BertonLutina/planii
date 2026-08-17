import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Tabs, type TabItem } from '@/components/ui'
import { NotifBell } from '@/components/NotifBell'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { HelpButton } from '@/screens/guide'
import {
  AuditSection, DashboardSection, DashSkeleton, MailSection, ProjectsSection,
  TasksSection, UsersSection,
} from '@/screens/admin'
import { useTheme } from '@/theme/ThemeProvider'

/* Espace admin — portage de `Admin` (planii-vite/src/components/Admin.tsx).
 * L'onglet est déjà masqué et injoignable pour un non-admin : la garde vit dans
 * app/(tabs)/_layout.tsx (`href: me?.admin ? undefined : null`).
 *
 * ── Ce que le web fait et que le téléphone ne peut pas reprendre tel quel ──
 *
 * Le web pose quatre listes larges (utilisateurs, tâches, projets, audit) où
 * chaque ligne aligne jusqu'à huit métadonnées et deux boutons. À 320 pt, une
 * de ces lignes occupe cinq lignes de texte et le nom se perd. Chaque tableau
 * devient donc une `FlatList` de cartes qui ne portent que ce qu'on cherche du
 * regard — deux ou trois champs — et poussent le reste dans une feuille de
 * détail, ouverte par un appui sur la carte :
 *
 *   — Utilisateurs : qui (avatar + nom + rôle), comment le joindre (e-mail),
 *     son activité (points, dernière visite). Projets, tâches ouvertes et
 *     terminées, inscription : dans la fiche, avec les deux actions
 *     conséquentes (rôle admin, suppression).
 *   — Tâches : drapeau de priorité + titre, puis projet · responsable ·
 *     échéance. Pas de fiche : `adminTask` n'a rien de plus à montrer. Les six
 *     boutons P1…P6 que le web pose sur chaque ligne (264 pt de cibles !)
 *     deviennent le menu d'actions ouvert par l'appui.
 *   — Projets : nom, état, avancement — ce qu'on compare d'un projet à
 *     l'autre. Propriétaire, e-mail masqué, échéance, création et suppression
 *     dans la fiche : un bouton destructeur n'a pas sa place à portée de pouce
 *     dans une liste qui défile.
 *   — Audit : action, détail, auteur, date. Tout tient, pas de fiche.
 *
 * La section « Admins » du web (la même liste, filtrée) devient un filtre en
 * puces dans « Utilisateurs » : un onglet de plus pour une liste filtrée ne se
 * justifie pas quand la barre défile déjà.
 *
 * Les graphiques sont des `View` empilées (voir Bars.tsx) : aucune
 * bibliothèque, et chaque barre est un élément accessible qui énonce sa valeur.
 */

type Section = 'dash' | 'users' | 'tasks' | 'projects' | 'mail' | 'audit'

export default function AdminScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const { me } = useSession()
  useI18n()

  const [sec, setSec] = useState<Section>('dash')
  const isSuper = !!me?.superAdmin

  /* Le bas de chaque liste doit dégager la barre d'onglets, et la boîte mail
     son bouton flottant (56 pt + marge). */
  const padBottom = insets.bottom + 96

  const items: TabItem<Section>[] = [
    { key: 'dash', label: t('ad.dash'), icon: 'chart-bar' },
    { key: 'users', label: t('ad.users'), icon: 'users' },
    { key: 'tasks', label: t('ad.tasks'), icon: 'tasks' },
    { key: 'projects', label: t('ad.projects'), icon: 'folder' },
    ...(isSuper
      ? ([
        { key: 'mail', label: t('ad.mail'), icon: 'inbox' },
        { key: 'audit', label: t('ad.audit'), icon: 'list' },
      ] as TabItem<Section>[])
      : []),
  ]

  let body: React.ReactNode
  if (!me) {
    body = <View style={s.pad}><DashSkeleton /></View>
  } else if (sec === 'users') {
    body = <UsersSection me={me} isSuper={isSuper} padBottom={padBottom} />
  } else if (sec === 'tasks') {
    body = <TasksSection padBottom={padBottom} />
  } else if (sec === 'projects') {
    body = <ProjectsSection padBottom={padBottom} />
  } else if (sec === 'mail' && isSuper) {
    body = <MailSection padBottom={padBottom} />
  } else if (sec === 'audit' && isSuper) {
    body = <AuditSection padBottom={padBottom} />
  } else {
    body = <DashboardSection padBottom={padBottom} />
  }

  return (
    <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" numberOfLines={1} style={[s.title, { color: c.text }]}>
          {t('nav.admin')}
        </Text>
        <NotifBell />
        <HelpButton tab="admin" />
      </View>

      <View style={s.switcher}>
        <Tabs items={items} value={sec} onChange={setSec} scrollable />
      </View>

      {body}
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  title: { flex: 1, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  switcher: { paddingHorizontal: 18, paddingBottom: 14 },
  pad: { paddingHorizontal: 18 },
})
