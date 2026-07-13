import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../src/app'
import { q } from '../src/db/pool'
import { uid } from '../src/lib/utils'
import * as UserView from '../src/views/User.view'
import { dbAvailable, resetDb } from './setup'

const app = createApp()

describe('task permissions', () => {
  let ownerToken = ''
  let memberToken = ''
  let taskId = ''

  beforeEach(async () => {
    if (!dbAvailable) return
    await resetDb()

    const ownerId = uid()
    const memberId = uid()
    const projectId = uid()
    taskId = uid()
    const pass = bcrypt.hashSync('secret123', 10)

    await q('INSERT INTO users (id,name,email,pass_hash) VALUES ($1,$2,$3,$4), ($5,$6,$7,$8)', [
      ownerId, 'Owner', 'owner@planii.app', pass,
      memberId, 'Member', 'member@planii.app', pass,
    ])
    await q('INSERT INTO projects (id,name,type,owner_id) VALUES ($1,$2,$3,$4)', [projectId, 'Projet test', 'solo', ownerId])
    await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4), ($5,$2,$6,$7)', [
      uid(), projectId, ownerId, 'owner',
      uid(), memberId, 'client',
    ])
    await q(`INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,'todo','À faire','#9a988f',0,true)`, [uid(), projectId])
    await q(`INSERT INTO tasks (id,project_id,title,assignee_id,created_by,status_key) VALUES ($1,$2,$3,$4,$5,'todo')`, [
      taskId, projectId, 'Ma tâche', memberId, ownerId,
    ])

    ownerToken = UserView.signToken({ id: ownerId, name: 'Owner', email: 'owner@planii.app', pass_hash: pass } as never)
    memberToken = UserView.signToken({ id: memberId, name: 'Member', email: 'member@planii.app', pass_hash: pass } as never)
  })

  it('only assignee can mark task done', async (ctx) => {
    if (!dbAvailable) return ctx.skip()

    const denied = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ done: true })
    expect(denied.status).toBe(403)

    const ok = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ done: true })
    expect(ok.status).toBe(200)
    expect(ok.body.ok).toBe(true)
  })
})
