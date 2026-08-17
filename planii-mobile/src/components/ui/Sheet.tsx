import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView,
  StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ic } from '@/components/Icon'
import { t } from '@/lib/i18n'
import { useTheme } from '@/theme/ThemeProvider'
import { useReduceMotion } from './useReduceMotion'

export interface SheetProps {
  /** Contrôle l'affichage. Ne montez pas deux feuilles l'une sur l'autre. */
  open: boolean
  onClose: () => void
  /** Titre de la feuille — obligatoire pour l'accessibilité. */
  title?: string
  children?: ReactNode
  /** Pied collant : boutons d'action (bouton principal en premier). */
  actions?: ReactNode
  /** Corps défilant (défaut : oui). Passez `false` pour gérer vous-même un FlatList. */
  scrollable?: boolean
  /** Cache la croix (rare — laissez-la sauf sur un flux obligatoire). */
  hideClose?: boolean
  contentStyle?: StyleProp<ViewStyle>
  /**
   * `bottom` (défaut) — feuille ancrée en bas, pour les menus d'action et tout
   * ce qui se manipule au pouce.
   * `center` — boîte de dialogue centrée, pour un choix court dans une liste :
   * l'œil reste au milieu de l'écran au lieu de descendre en bas.
   */
  placement?: 'bottom' | 'center'
}

/** Feuille modale — ancrée en bas par défaut, centrée avec `placement="center"`.
 *  Voile `scrim`, titre + fermeture, clavier évité, corps défilant, pied collant.
 *  Dans les deux cas la hauteur est plafonnée et le corps défile au-delà. */
export function Sheet({
  open, onClose, title, children, actions,
  scrollable = true, hideClose = false, contentStyle, placement = 'bottom',
}: SheetProps) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const reduce = useReduceMotion()
  const centered = placement === 'center'
  // Hauteur maxi en pixels, pas en pourcentage : un « 78% » se calcule sur le
  // parent, et si celui-ci n'a pas de hauteur définie il ne résout pas — la
  // boîte s'écrase alors sur son en-tête et le corps disparaît.
  const { height: winH } = useWindowDimensions()

  const body = scrollable
    ? (
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollInner, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    )
    : (
      /* `flex: 1` seulement pour la feuille basse, qui remplit l'espace laissé.
         Sur la boîte centrée il imposerait `flexBasis: 0` : le corps ne
         compterait plus dans la hauteur de la boîte, qui s'écraserait sur son
         en-tête pendant que le contenu déborde par-dessus la page. */
      <View style={[s.scrollInner, centered ? null : s.flex, contentStyle]}>{children}</View>
    )

  return (
    <RNModal
      visible={open}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType={reduce || centered ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={centered ? s.rootCenter : s.root}>
        <Pressable
          style={[s.scrim, { backgroundColor: c.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('action.close')}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={centered ? s.kavCenter : s.kav}
          pointerEvents="box-none"
        >
          <View
            accessibilityViewIsModal
            style={[
              centered ? s.dialog : s.sheet,
              { backgroundColor: c.surface },
              centered ? { maxHeight: Math.round(winH * 0.78) } : null,
              // En bas, on dégage l'indicateur d'accueil ; centré, il n'y a rien à dégager.
              centered ? null : { paddingBottom: insets.bottom + 12 },
            ]}
          >
            {!centered && <View style={[s.handle, { backgroundColor: c.lineStrong }]} />}
            {(!!title || !hideClose) && (
              <View style={[s.head, { borderBottomColor: c.line }]}>
                <Text numberOfLines={2} style={[s.title, { color: c.text }]}>{title}</Text>
                {!hideClose && (
                  <Pressable
                    onPress={onClose}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('action.close')}
                    style={({ pressed }) => [
                      s.close,
                      { borderColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' },
                    ]}
                  >
                    <Ic name="x" s={17} c={c.muted} strokeWidth={2.1} />
                  </Pressable>
                )}
              </View>
            )}
            {body}
            {!!actions && (
              <View style={[s.actions, { borderTopColor: c.line, backgroundColor: c.surface }]}>{actions}</View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // Centré : la boîte est au milieu, avec une gouttière pour ne jamais toucher les bords.
  rootCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  kav: { justifyContent: 'flex-end' },
  // flex : donne au conteneur une hauteur définie, sans quoi la boîte centrée
  // n'a aucune référence verticale.
  kavCenter: { flex: 1, width: '100%', maxWidth: 420, justifyContent: 'center' },
  flex: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingTop: 8 },
  /* Largeur pleine (plafonnée à 420) pour qu'aucun libellé ne soit tronqué ;
     hauteur plafonnée à 78 % — au-delà, le corps défile. */
  dialog: {
    width: '100%', borderRadius: 20, overflow: 'hidden', paddingTop: 16, paddingBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1,
  },
  title: { flex: 1, fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  close: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // flexShrink : sans lui, le corps déborde du plafond de hauteur au lieu de défiler.
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollInner: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1 },
})
