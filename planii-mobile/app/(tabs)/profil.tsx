import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Button, Confirm, NATIVE_TAB_BAR, SectionHeader, Skeleton } from '@/components/ui'
import { t, useI18n } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { roleLibraryOf, taskTypesOf } from '@/lib/tasktype'
import { EmailNotifsSection } from '@/screens/profile/EmailNotifsSection'
import { InfoSection } from '@/screens/profile/InfoSection'
import { LangPicker } from '@/screens/profile/LangPicker'
import { ListEditor } from '@/screens/profile/ListEditor'
import { ProfileHero } from '@/screens/profile/ProfileHero'
import { ProjectLabelEditor } from '@/screens/profile/ProjectLabelEditor'
import { ThemeControl } from '@/screens/profile/ThemeControl'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'

/* Profil — portage de `Profile` (planii-vite/src/App.tsx).
   Le web pose deux colonnes (`.profile-grid`) ; sur mobile tout s'empile dans
   un seul fil, des réglages les plus personnels aux plus techniques :
   identité → informations → e-mails → rôles → libellés → types de tâches →
   admin → thème → langue → déconnexion. */

export default function ProfilScreen() {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me, signOut } = useSession()
  useI18n()

  const [confirmOut, setConfirmOut] = useState(false)

  return (
    <View style={[s.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>{t('nav.profile')}</Text>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {!me ? (
          <ProfileSkeleton />
        ) : (
          <>
            <ProfileHero me={me} />

            <InfoSection me={me} />

            <EmailNotifsSection me={me} />

            <ListEditor
              me={me}
              title={t('profile.roles')}
              desc={t('profile.rolesDesc')}
              field="roleLibrary"
              get={roleLibraryOf}
              placeholder={t('profile.newRole')}
              maxLen={40}
              emptyNote={t('profile.rolesEmpty')}
            />

            <ProjectLabelEditor />

            <ListEditor
              me={me}
              title={t('profile.taskTypes')}
              desc={t('profile.typesDesc')}
              field="taskTypes"
              get={taskTypesOf}
              placeholder={t('profile.newType')}
              maxLen={30}
              emptyNote={t('profile.typesEmpty')}
            />

            {!!me.admin && (
              <Button
                label={t('profile.adminSpace')}
                icon="shield"
                variant="primary"
                block
                onPress={() => router.push('/admin')}
                style={s.admin}
              />
            )}

            <ThemeControl />

            <SectionHeader title={t('lang.title')} />
            <LangPicker />

            <Button
              label={t('profile.logout')}
              icon="logout"
              variant="danger"
              block
              onPress={() => setConfirmOut(true)}
              style={s.logout}
            />
          </>
        )}
      </ScrollView>

      <Confirm
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title="Se déconnecter ?"
        message="Il faudra saisir de nouveau ton e-mail et ton mot de passe pour revenir."
        confirmLabel={t('profile.logout')}
        onConfirm={() => { setConfirmOut(false); signOut() }}
      />
    </View>
  )
}

/** Chargement — même gabarit que l'écran final (hero, carte d'infos, sections). */
function ProfileSkeleton() {
  return (
    <View accessibilityLabel={t('common.loading')} accessibilityRole="progressbar" style={s.skel}>
      <Skeleton height={132} borderRadius={radius.card} />
      <Skeleton width={130} height={13} style={s.skelHead} />
      <Skeleton height={184} borderRadius={radius.card} />
      <Skeleton width={160} height={13} style={s.skelHead} />
      <Skeleton height={96} borderRadius={radius.card} />
      <Skeleton width={110} height={13} style={s.skelHead} />
      <Skeleton height={110} borderRadius={radius.card} />
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  body: { paddingHorizontal: 18, paddingBottom: 32 + NATIVE_TAB_BAR },
  admin: { marginTop: 20 },
  logout: { marginTop: 22 },
  skel: { gap: 12 },
  skelHead: { marginTop: 8 },
})
