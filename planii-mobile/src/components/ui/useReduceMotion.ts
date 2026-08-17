import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/** `true` quand l'utilisateur a demandé moins d'animations (iOS/Android).
 *  Toute animation décorative (miroitement, ressort) doit s'y plier. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduce(v) })
      .catch(() => { /* ignore */ })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v))
    return () => { alive = false; sub.remove() }
  }, [])
  return reduce
}
