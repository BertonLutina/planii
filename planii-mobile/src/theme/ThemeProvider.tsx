import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { dark, light, type Colors } from './tokens'

export type Theme = 'light' | 'dark' | 'auto'
export type Resolved = 'light' | 'dark'

const KEY = 'planii.theme'

/* `auto` suit le réglage système de l'appareil — convention native, là où le
   web bascule sur l'heure. Sur mobile l'utilisateur attend de retrouver son
   choix iOS/Android, pas une règle propre à l'app. */

interface Ctx {
  /** Préférence enregistrée. */
  pref: Theme
  /** Thème réellement affiché. */
  scheme: Resolved
  /** Palette active. */
  c: Colors
  dark: boolean
  setPref: (t: Theme) => void
}

const ThemeCtx = createContext<Ctx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [pref, setPrefState] = useState<Theme>('auto')

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === 'light' || v === 'dark' || v === 'auto') setPrefState(v) })
      .catch(() => { /* ignore */ })
  }, [])

  const setPref = useCallback((t: Theme) => {
    setPrefState(t)
    AsyncStorage.setItem(KEY, t).catch(() => { /* ignore */ })
  }, [])

  const scheme: Resolved = pref === 'auto' ? (system === 'dark' ? 'dark' : 'light') : pref
  const value = useMemo<Ctx>(() => ({
    pref,
    scheme,
    c: scheme === 'dark' ? dark : light,
    dark: scheme === 'dark',
    setPref,
  }), [pref, scheme, setPref])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useTheme(): Ctx {
  const v = useContext(ThemeCtx)
  if (!v) throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  return v
}
