import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../src/app'
import { q, one } from '../src/db/pool'
import { uid } from '../src/lib/utils'
import * as UserView from '../src/views/User.view'
import { dbAvailable, resetDb } from './setup'

const app = createApp()

describe('task bulk import', () => {
  let ownerToken = ''
  let outsiderToken = ''
  let projectId = ''

  beforeEach(async () => {
    if (!dbAvailable) return
    await resetDb()

    const ownerId = uid()
    const outsiderId = uid()
    projectId = uid()
    const pass = bcrypt.hashSync('secret123', 10)

    await q('INSERT INTO users (id,name,email,pass_hash) VALUES ($1,$2,$3,$4), ($5,$6,$7,$8)', [
      ownerId, 'Owner', 'owner@planii.app', pass,
      outsiderId, 'Outsider', 'out@planii.app', pass,
    ])
    await q('INSERT INTO projects (id,name,type,owner_id) VALUES ($1,$2,$3,$4)', [projectId, 'Projet import', 'solo', ownerId])
    await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4)', [
      uid(), projectId, ownerId, 'owner',
    ])
    await q(`INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,'todo','À faire','#9a988f',0,true)`, [uid(), projectId])

    ownerToken = UserView.signToken({ id: ownerId, name: 'Owner', email: 'owner@planii.app', pass_hash: pass } as never)
    outsiderToken = UserView.signToken({ id: outsiderId, name: 'Outsider', email: 'out@planii.app', pass_hash: pass } as never)
  })

  it('creates multiple tasks in one request', async (ctx) => {
    if (!dbAvailable) return ctx.skip()

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/bulk`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tasks: [
          { title: 'Tâche A', due: '2026-08-01', priority: 2 },
          { title: 'Tâche B', priority: 5 },
        ],
      })

    expect(res.status).toBe(200)
    expect(res.body.tasks).toHaveLength(2)
    expect(res.body.tasks[0].title).toBe('Tâche A')
    expect(res.body.tasks[0].due).toBe('2026-08-01')
    expect(res.body.tasks[0].priority).toBe(2)
    expect(res.body.tasks[1].title).toBe('Tâche B')

    const count = await one<{ n: string }>('SELECT count(*)::text AS n FROM tasks WHERE project_id=$1', [projectId])
    expect(Number(count!.n)).toBe(2)
  })

  it('rejects empty tasks array', async (ctx) => {
    if (!dbAvailable) return ctx.skip()

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/bulk`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ tasks: [] })

    expect(res.status).toBe(400)
  })

  it('rejects more than 500 tasks', async (ctx) => {
    if (!dbAvailable) return ctx.skip()

    const tasks = Array.from({ length: 501 }, (_, i) => ({ title: `T${i}` }))
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/bulk`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ tasks })

    expect(res.status).toBe(400)
  })

  it('denies non-members', async (ctx) => {
    if (!dbAvailable) return ctx.skip()

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/bulk`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ tasks: [{ title: 'Nope' }] })

    expect(res.status).toBe(403)
  })
})
