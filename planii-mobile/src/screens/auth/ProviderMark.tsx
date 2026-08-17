import Svg, { Path, Rect } from 'react-native-svg'
import { useTheme } from '@/theme/ThemeProvider'
import type { ProviderKey } from './oauth'

/* Logos des fournisseurs.
 *
 * Deux rendus, un par contexte :
 *
 * - `colored` (défaut) — les marques officielles, aux couleurs officielles.
 *   C'est ce qu'affiche le web, et ce que les chartes de Google et Microsoft
 *   exigent quand le bouton porte le logo seul, sans le nom écrit à côté.
 *   Les teintes sont saturées : elles tiennent sur `surface` en clair comme en
 *   sombre. Seul le violet Yahoo (#6001D2, 2.4:1 sur #191426) ne tiendrait pas
 *   en thème sombre — il est éclairci en #9b5df0, la même marque en plus clair.
 *
 * - monochrome (`color` fourni) — la silhouette teintée par l'appelant, pour
 *   les cas où le logo accompagne un libellé et ne doit pas voler la vedette.
 */

export function ProviderMark({ provider, size = 19, color }: {
  provider: ProviderKey
  size?: number
  /** Force un aplat monochrome. Absent = couleurs officielles. */
  color?: string
}) {
  const { c } = useTheme()
  const mono = !!color
  const dark = c.bg !== '#f7f7f8' && c.text !== '#0d0d0d'
  const f = (official: string) => (mono ? (color as string) : official)

  if (provider === 'microsoft') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={1} y={1} width={10} height={10} fill={f('#F25022')} />
        <Rect x={13} y={1} width={10} height={10} fill={f('#7FBA00')} opacity={mono ? 0.72 : 1} />
        <Rect x={1} y={13} width={10} height={10} fill={f('#00A4EF')} opacity={mono ? 0.72 : 1} />
        <Rect x={13} y={13} width={10} height={10} fill={f('#FFB900')} opacity={mono ? 0.45 : 1} />
      </Svg>
    )
  }

  if (provider === 'linkedin') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          fill={f(dark ? '#3D9BE9' : '#0A66C2')}
          d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0z"
        />
      </Svg>
    )
  }

  if (provider === 'yahoo') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          fill={f(dark ? '#9b5df0' : '#6001D2')}
          d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm6.1 6.5h-2.3c-.2-.8-.5-1.5-.9-2.1 1.3.5 2.4 1.2 3.2 2.1zm-6.1-3.3c.7.8 1.3 1.9 1.6 3.3h-3.2c.3-1.4.9-2.5 1.6-3.3zM4.7 14.2c-.3-.7-.5-1.4-.5-2.2s.2-1.5.5-2.2h2.6c-.1.7-.1 1.4-.1 2.2s0 1.5.1 2.2H4.7zm1.2 1.5h2.3c.2.8.5 1.5.9 2.1-1.3-.5-2.4-1.2-3.2-2.1zm2.3-7.2H5.9c.8-.9 1.9-1.6 3.2-2.1-.4.6-.7 1.3-.9 2.1zM12 20.8c-.7-.8-1.3-1.9-1.6-3.3h3.2c-.3 1.4-.9 2.5-1.6 3.3zm2-5.1h-4c-.1-.7-.1-1.4-.1-2.2s0-1.5.1-2.2h4c.1.7.1 1.4.1 2.2s0 1.5-.1 2.2zm.4 4.2c.4-.6.7-1.3.9-2.1h2.3c-.8.9-1.9 1.6-3.2 2.1zm1.3-9.3c-.2-.8-.5-1.5-.9-2.1 1.3.5 2.4 1.2 3.2 2.1h-2.3zm2.4 5.1c.1-.7.1-1.4.1-2.2s0-1.5-.1-2.2h2.6c.3.7.5 1.4.5 2.2s-.2 1.5-.5 2.2h-2.6z"
        />
      </Svg>
    )
  }

  /* google — les quatre segments de la marque */
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={f('#4285F4')} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill={f('#34A853')} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill={f('#FBBC05')} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill={f('#EA4335')} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  )
}
