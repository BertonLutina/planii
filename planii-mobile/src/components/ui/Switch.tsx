import { useEffect } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { useReduceMotion } from './useReduceMotion'

export interface SwitchProps {
  value: boolean
  onValueChange: (v: boolean) => void
  disabled?: boolean
  /** Obligatoire dès que l'interrupteur n'est pas accompagné d'un texte visible. */
  accessibilityLabel?: string
  testID?: string
}

/** Interrupteur (`.mail-switch`) : piste 44×26, bouton 20 pt.
 *  Zone tactile portée à 44 pt par `hitSlop`. */
export function Switch({ value, onValueChange, disabled = false, accessibilityLabel, testID }: SwitchProps) {
  const { c } = useTheme()
  const reduce = useReduceMotion()
  const x = useSharedValue(value ? 18 : 0)

  useEffect(() => {
    x.value = reduce ? (value ? 18 : 0) : withTiming(value ? 18 : 0, { duration: 150 })
  }, [value, reduce, x])

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <Pressable
      testID={testID}
      onPress={() => { if (!disabled) onValueChange(!value) }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={{ top: 9, bottom: 9, left: 6, right: 6 }}
      style={[
        s.track,
        {
          backgroundColor: value ? c.accent : c.soft,
          borderColor: value ? c.accent : c.lineStrong,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Animated.View style={[s.knob, { backgroundColor: value ? c.onAccent : c.surface, shadowColor: c.shadowColor }, knob]} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center', padding: 2, flex: 0 },
  knob: {
    width: 20, height: 20, borderRadius: 10,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2,
  },
})
