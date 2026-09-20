import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import * as MailService from '../src/services/mail.service'
import { dbAvailable, resetDb } from './setup'

const app = createApp()

describe('auth', () => {
  beforeEach(async () => { if (dbAvailable) await resetDb() })

  it('register + login', async (ctx) => {
    if (!dbAvailable) return ctx.skip()

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@planii.app', password: 'secret123' })
    expect(reg.status).toBe(200)
    expect(reg.body.token).toBeTruthy()
    expect(reg.body.user.email).toBe('test@planii.app')

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@planii.app', password: 'secret123' })
    expect(login.status).toBe(200)
    expect(login.body.token).toBeTruthy()
  })

  it('rejects invalid login', async (ctx) => {
    if (!dbAvailable) return ctx.skip()

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@planii.app', password: 'secret123' })

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@planii.app', password: 'wrong' })
    expect(login.status).toBe(401)
  })

  it('health check', async (ctx) => {
    if (!dbAvailable) return ctx.skip()
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('forgot password sends a reset mail and the token works once', async (ctx) => {
    if (!dbAvailable) return ctx.skip()
    const sendMail = vi.spyOn(MailService, 'sendMail').mockResolvedValue(undefined)

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Awa', email: 'awa@planii.app', password: 'ancien12' })

    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'awa@planii.app' })
    expect(forgot.status).toBe(200)
    expect(forgot.body.ok).toBe(true)
    expect(sendMail).toHaveBeenCalledTimes(1)
    const ctaUrl = (sendMail.mock.calls[0][2] as { ctaUrl?: string }).ctaUrl || ''
    const token = new URL(ctaUrl).searchParams.get('token')
    expect(token).toBeTruthy()

    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'inconnu@planii.app' })
    expect(unknown.status).toBe(200)
    expect(unknown.body.ok).toBe(true)
    expect(sendMail).toHaveBeenCalledTimes(1)

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'nouveau12' })
    expect(reset.status).toBe(200)

    const replay = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'autrepass' })
    expect(replay.status).toBe(400)

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'awa@planii.app', password: 'ancien12' })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'awa@planii.app', password: 'nouveau12' })
    expect(newLogin.status).toBe(200)
    expect(newLogin.body.token).toBeTruthy()

    sendMail.mockRestore()
  })

  it('rejects an invalid reset token', async (ctx) => {
    if (!dbAvailable) return ctx.skip()
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'nouveau12' })
    expect(res.status).toBe(400)
  })
})
