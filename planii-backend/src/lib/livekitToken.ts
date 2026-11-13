import jwt from 'jsonwebtoken'

/** Salle stable d'un projet : tous les membres rejoignent la même. */
export const livekitRoom = (projectId: string) => 'planii-' + projectId

/**
 * Jeton d'accès LiveKit (HS256). `iss` est la clé API, le secret signe.
 * Le client ne reçoit jamais le secret : seulement cette chaîne et l'URL wss.
 */
export function signLiveKitToken(opts: {
  apiKey: string
  apiSecret: string
  identity: string
  name: string
  room: string
  ttlSeconds?: number
  now?: number
}): string {
  const now = opts.now ?? Math.floor(Date.now() / 1000)
  const ttl = opts.ttlSeconds ?? 6 * 60 * 60
  return jwt.sign(
    {
      iss: opts.apiKey,
      sub: opts.identity,
      name: opts.name,
      nbf: now - 10,
      exp: now + ttl,
      video: {
        roomJoin: true,
        room: opts.room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    },
    opts.apiSecret,
    { algorithm: 'HS256' },
  )
}
