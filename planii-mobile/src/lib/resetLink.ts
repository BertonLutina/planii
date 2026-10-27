/** Extraire un jeton de reset sans jamais le journaliser ni le persister. */

const TOKEN_RE = /^[A-Za-z0-9._~-]{16,512}$/

export function parseResetToken(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const fromUrl = trimmed.includes('://') || trimmed.startsWith('/')
      ? new URL(trimmed, 'planii://app').searchParams.get('token')
      : trimmed
    const token = (fromUrl ?? '').trim()
    return TOKEN_RE.test(token) ? token : ''
  } catch {
    return TOKEN_RE.test(trimmed) ? trimmed : ''
  }
}
