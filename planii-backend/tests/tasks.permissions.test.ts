import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { createApp } from '../src/app'
import { q } from '../src/db/pool'
import { uid } from '../src/lib/utils'
import * as UserView from '../src/views/User.view'
import * as MailService from '../src/services/mail.service'
import { dbAvailable, resetDb } from './setup'

const app = createApp()

describe('task permissions', () => {
  let ownerToken = ''
  let memberToken = ''
  let otherToken = ''
  let taskId = ''
  let ownerId = ''
  let memberId = ''
  let otherId = ''
  let projectId = ''

  beforeEach(async () => {
    if (!dbAvailable) return
    await resetDb()

    ownerId = uid()
    memberId = uid()
    otherId = uid()
    projectId = uid()
    taskId = uid()
    const pass = bcrypt.hashSync('secret123', 10)

    await q('INSERT INTO users (id,name,email,pass_hash) VALUES ($1,$2,$3,$4), ($5,$6,$7,$8), ($9,$10,$11,$12)', [
      ownerId, 'Owner', 'owner@planii.app', pass,
      memberId, 'Member', 'member@planii.app', pass,
      otherId, 'Other', 'other@planii.app', pass,
    ])
    await q('INSERT INTO projects (id,name,type,owner_id) VALUES ($1,$2,$3,$4)', [projectId, 'Projet test', 'solo', ownerId])
    await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4), ($5,$2,$6,$7), ($8,$2,$9,$10)', [
      uid(), projectId, ownerId, 'owner',
      uid(), memberId, 'client',
      uid(), otherId, 'client',
    ])
    await q(`INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,'todo','À faire','#9a988f',0,true)`, [uid(), projectId])
    await q(`INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,'in_progress','En cours','#3b82d6',1,true)`, [uid(), projectId])
    await q(`INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,'transferred','Transféré','#f59f30',3,false)`, [uid(), projectId])
    await q(`INSERT INTO tasks (id,project_id,title,assignee_id,created_by,status_key,transferable) VALUES ($1,$2,$3,$4,$5,'todo',true)`, [
      taskId, projectId, 'Ma tâche', memberId, ownerId,
    ])

    ownerToken = UserView.signToken({ id: ownerId, name: 'Owner', email: 'owner@planii.app', pass_hash: pass } as never)
    memberToken = UserView.signToken({ id: memberId, name: 'Member', email: 'member@planii.app', pass_hash: pass } as never)
    otherToken = UserView.signToken({ id: otherId, name: 'Other', email: 'other@planii.app', pass_hash: pass } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('emails the assignee when task status changes', async (ctx) => {
    if (!dbAvailable) return ctx.skip()
    const sendMail = vi.spyOn(MailService, 'sendMail').mockResolvedValue(undefined)

    const ok = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ statusKey: 'in_progress' })

    expect(ok.status).toBe(200)
    expect(sendMail).toHaveBeenCalledWith(
      'member@planii.app',
      expect.stringContaining('Ma tâche'),
      expect.objectContaining({
        intro: expect.stringContaining('Owner'),
      }),
      expect.objectContaining({ key: 'tStatus', userId: memberId }),
    )
  })

  it('emails both receiver and actor when a task is transferred', async (ctx) => {
    if (!dbAvailable) return ctx.skip()
    const sendMail = vi.spyOn(MailService, 'sendMail').mockResolvedValue(undefined)

    const ok = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ statusKey: 'transferred', transferredTo: otherId })

    expect(ok.status).toBe(200)
    expect(sendMail).toHaveBeenCalledWith(
      'other@planii.app',
      expect.stringContaining('Ma tâche'),
      expect.objectContaining({
        intro: expect.stringContaining('Member'),
      }),
      expect.objectContaining({ key: 'tTransferReceived', userId: otherId }),
    )
    expect(sendMail).toHaveBeenCalledWith(
      'member@planii.app',
      expect.stringContaining('Ma tâche'),
      expect.objectContaining({
        intro: expect.stringContaining('Other'),
      }),
      expect.objectContaining({ key: 'tTransferConfirmed', userId: memberId }),
    )
  })
})
