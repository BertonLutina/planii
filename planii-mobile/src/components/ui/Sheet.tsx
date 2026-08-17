import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View, type StyleProp, type ViewStyle,
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
}

/** Feuille modale ancrée en bas — remplaçante native de la `Modal` du web.
 *  Voile `scrim`, coins hauts 20, poignée, titre + fermeture, clavier évité,
 *  marge de sécurité basse, corps défilant, pied d'actions collant. */
export function Sheet({
  open, onClose, title, children, actions,
  scrollable = true, hideClose = false, contentStyle,
}: SheetProps) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const reduce = useReduceMotion()

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
    : <View style={[s.scrollInner, s.flex, contentStyle]}>{children}</View>

  return (
    <RNModal
      visible={open}
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      animationType={reduce ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <Pressable
          style={[s.scrim, { backgroundColor: c.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('action.close')}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.kav}
          pointerEvents="box-none"
        >
          <View
            accessibilityViewIsModal
            style={[s.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 12 }]}
          >
            <View style={[s.handle, { backgroundColor: c.lineStrong }]} />
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
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  kav: { justifyContent: 'flex-end' },
  flex: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingTop: 8 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1,
  },
  title: { flex: 1, fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  close: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  scrollInner: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1 },
})
