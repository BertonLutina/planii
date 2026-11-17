import { initials } from '@/lib/dates'

const PALETTE = ['#6d5cff', '#1f6fc9', '#0b7a5a', '#b45309', '#be185d', '#7c3aed']

/** Couleur d'avatar stable par nom (même personne, même couleur partout). */
export function avatarColor(name?: string): string {
  let h = 0
  for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Avatar rond de la page projet (photo si elle existe, sinon initiales). */
export function PvAvatar({ name, src, size }: { name?: string; src?: string | null; size?: 'sm' | 'lg' }) {
  return (
    <span className={'pv-av' + (size ? ' ' + size : '')} style={{ ['--c' as string]: avatarColor(name) }} title={name}>
      {src ? <img src={src} alt={name || ''} /> : initials(name)}
    </span>
  )
}
