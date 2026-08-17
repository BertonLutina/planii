import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, shadow } from '@/theme/tokens'
import { useReduceMotion } from './useReduceMotion'

/* Bus de notifications — même API que `planii-vite/src/lib/ui.tsx` :
   `toast('Enregistré ✓')` et `toastErr(e.message)` s'appellent depuis
   n'importe où, y compris hors composant. */

interface ToastMsg { id: number; text: string; err?: boolean }

let seq = 0
let emit: ((m: ToastMsg) => void) | null = null

/** Message neutre (confirmation). */
export const toast = (text: string): void => { emit?.({ id: ++seq, text }) }
/** Message d'erreur (fond `danger`). */
export const toastErr = (text: string): void => { emit?.({ id: ++seq, text, err: true }) }

const DURATION = 2500

export interface ToastProviderProps { children?: ReactNode }

/** À monter une seule fois, à la racine de l'app (au-dessus du routeur). */
export function ToastProvider({ children }: ToastProviderProps) {
  const { c } = useTheme()
  const insets = useSafeAreaInsets()
  const reduce = useReduceMotion()
  const [queue, setQueue] = useState<ToastMsg[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    emit = (m) => setQueue((q) => (q.length > 3 ? q : [...q, m]))
    return () => { emit = null }
  }, [])

  const shift = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setQueue((q) => q.slice(1))
  }, [])

  const head = queue[0]

  useEffect(() => {
    if (!head) return
    timer.current = setTimeout(shift, DURATION)
    return () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }
  }, [head, shift])

  return (
    <View style={s.root}>
      {children}
      {!!head && (
        <View pointerEvents="box-none" style={[s.layer, { paddingBottom: insets.bottom + 90 }]}>
          <Animated.View
            key={head.id}
            entering={reduce ? FadeIn.duration(120) : FadeInDown.duration(180)}
            exiting={reduce ? FadeOut.duration(120) : FadeOutDown.duration(180)}
          >
            <Pressable
              onPress={shift}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityLabel={head.text}
              accessibilityHint="Appuyez pour fermer"
              style={[s.pill, shadow, { backgroundColor: head.err ? c.danger : c.text, shadowColor: c.shadowColor }]}
            >
              <Text style={[s.txt, { color: c.bg }]}>{head.text}</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  layer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 18,
  },
  pill: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.pill, maxWidth: '100%' },
  txt: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
})
