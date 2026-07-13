import http from 'http'
import type { Express } from 'express'
import jwt from 'jsonwebtoken'
import { WebSocketServer, type WebSocket } from 'ws'
import { q, many } from '../db/pool'
import { env } from '../config/env'
import { uid } from '../lib/utils'
import * as ProjectModel from '../models/Project.model'
import { logger } from '../logger'

type WsClient = WebSocket & { userId?: string; isAlive?: boolean }

const wsClients = new Map<string, Set<WsClient>>()

export function wsSend(userId: string, payload: unknown) {
  const set = wsClients.get(userId)
  if (!set) return
  const data = JSON.stringify(payload)
  for (const ws of set) {
    try {
      if (ws.readyState === 1) ws.send(data)
    } catch { /* noop */ }
  }
}

const notifyUser = (userId: string, payload: unknown) => wsSend(userId, payload)

export async function notifyProject(projectId: string, payload: unknown) {
  try {
    for (const m of await ProjectModel.findMembers(projectId)) wsSend(m.user_id, payload)
  } catch (e) {
    logger.error({ err: e }, 'ws project')
  }
}

export const bump = (projectId: string) => notifyProject(projectId, { type: 'project', projectId })

export async function logActivity(projectId: string, userId: string, type: string, detail?: string) {
  await q('INSERT INTO activity (id,project_id,user_id,type,detail) VALUES ($1,$2,$3,$4,$5)',
    [uid(), projectId, userId, type, detail || ''])
  bump(projectId)
}

export async function recordTaskEvent(
  taskId: string,
  projectId: string,
  actorId: string | null,
  type: string,
  payload: Record<string, unknown> = {},
) {
  await q('INSERT INTO task_events (id,task_id,project_id,actor_id,type,payload) VALUES ($1,$2,$3,$4,$5,$6)',
    [uid(), taskId, projectId, actorId || null, type, JSON.stringify(payload || {})])
}

export async function notify(userId: string, type: string, title: string, detail?: string) {
  await q('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)',
    [uid(), userId, type, title, detail || ''])
  notifyUser(userId, { type: 'notif' })
}

export async function listForUser(userId: string) {
  const rows = await many('SELECT id,type,title,detail,read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [userId])
  const items = rows.map((n) => ({ id: n.id, type: n.type, title: n.title, detail: n.detail, read: n.read, at: n.created_at }))
  return { notifications: items, unread: items.filter((n) => !n.read).length }
}

export async function markRead(userId: string, ids?: string[]) {
  if (Array.isArray(ids) && ids.length)
    await q('UPDATE notifications SET read=true WHERE user_id=$1 AND id = ANY($2)', [userId, ids])
  else
    await q('UPDATE notifications SET read=true WHERE user_id=$1', [userId])
}

export async function removeNotification(userId: string, id: string) {
  await q('DELETE FROM notifications WHERE user_id=$1 AND id=$2', [userId, id])
}

export function createServer(app: Express) {
  const server = http.createServer(app)
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WsClient, req) => {
    try {
      const url = new URL(req.url || '', 'http://localhost')
      const token = url.searchParams.get('token')
      const payload = jwt.verify(token || '', env.JWT_SECRET) as { sub: string }
      const userId = payload.sub
      ws.userId = userId
      ws.isAlive = true
      if (!wsClients.has(userId)) wsClients.set(userId, new Set())
      wsClients.get(userId)!.add(ws)
      ws.on('pong', () => { ws.isAlive = true })
      ws.on('close', () => {
        const s = wsClients.get(userId)
        if (s) {
          s.delete(ws)
          if (!s.size) wsClients.delete(userId)
        }
      })
      ws.on('error', () => {})
      try { ws.send(JSON.stringify({ type: 'hello' })) } catch { /* noop */ }
    } catch {
      try { ws.close() } catch { /* noop */ }
    }
  })

  setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WsClient
      if (client.isAlive === false) return client.terminate()
      client.isAlive = false
      try { client.ping() } catch { /* noop */ }
    })
  }, 30000)

  return { server, wss }
}
