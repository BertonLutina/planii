import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { livekitRoom, signLiveKitToken } from '../src/lib/livekitToken'

describe('jeton LiveKit', () => {
  it('signe une salle de projet que le secret vérifie', () => {
    const room = livekitRoom('abc')
    const token = signLiveKitToken({
      apiKey: 'APIkey',
      apiSecret: 'secret-secret-secret',
      identity: 'user-1',
      name: 'Ada',
      room,
      now: Math.floor(Date.now() / 1000),
      ttlSeconds: 60,
    })
    const payload = jwt.verify(token, 'secret-secret-secret') as jwt.JwtPayload & {
      video: { room: string; roomJoin: boolean; canPublish: boolean; canSubscribe: boolean }
    }
    expect(room).toBe('planii-abc')
    expect(payload.iss).toBe('APIkey')
    expect(payload.sub).toBe('user-1')
    expect(payload.name).toBe('Ada')
    expect(payload.video.room).toBe('planii-abc')
    expect(payload.video.roomJoin).toBe(true)
    expect(payload.video.canPublish).toBe(true)
    expect(payload.video.canSubscribe).toBe(true)
  })
})
