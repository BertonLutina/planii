import { useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { t } from '@/lib/i18n'
import { useSession } from '@/lib/session'
import { getLabel, isAvailable, isEnabled, markOffered, wasOffered } from '@/lib/biometrics'
import { shouldOfferBiometrics } from '@/lib/sessionGate'

/** Après un vrai sign-in seulement. « Plus tard » et « Activer » marquent
 *  l’offre : elle ne revient pas toute seule. Le profil peut encore l’activer. */
export function useBiometricOffer() {
  const {
    me, locked, justSignedIn, consumeJustSignedIn, setBiometricEnabled,
  } = useSession()
  const userId = me?.id

  const enable = useCallback(() => {
    void setBiometricEnabled(true)
  }, [setBiometricEnabled])

  useEffect(() => {
    if (locked || !justSignedIn || !userId) return
    if (!consumeJustSignedIn()) return
    const id = userId
    ;(async () => {
      const [available, offered] = await Promise.all([
        isAvailable(),
        wasOffered(id),
      ])
      if (!shouldOfferBiometrics({ justSignedIn: true, available, offered })) return
      await markOffered(id)
      if (await isEnabled(id)) return
      const label = await getLabel()
      Alert.alert(
        t('bio.offerTitle', { label }),
        t('bio.offerBody', { label }),
        [
          { text: t('bio.later'), style: 'cancel' },
          { text: t('bio.enable'), onPress: enable },
        ],
      )
    })()
  }, [locked, justSignedIn, userId, consumeJustSignedIn, enable])
}
