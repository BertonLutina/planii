import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
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
})
