import http from 'http'
import crypto from 'crypto'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { createApp } from '../src/app'
import { q } from '../src/db/pool'
import { uid } from '../src/lib/utils'
import * as UserView from '../src/views/User.view'
import * as O from '../src/oauth/oauth.service'
import { _resetRateLimits } from '../src/mcp/tooling'
import { dbAvailable, resetDb } from './setup'

const app = createApp()
let server: http.Server
let base = ''

const b64 = (b: Buffer) => b.toString('base64url')
const pkce = () => {
  const verifier = b64(crypto.randomBytes(32))
  return { verifier, challenge: b64(crypto.createHash('sha256').update(verifier).digest()) }
}

async function mkUser(name: string) {
  const id = uid()
  await q('INSERT INTO users (id,name,email,pass_hash) VALUES ($1,$2,$3,$4)', [id, name, `${name.toLowerCase()}@planii.app`, bcrypt.hashSync('secret123', 10)])
  const row = (await q('SELECT * FROM users WHERE id=$1', [id])).rows[0]
  return { id, name, jwt: UserView.signToken(row), row }
}

/** Obtient des jetons MCP par le vrai flux OAuth (enregistrement → consentement → code → jeton), en passant par HTTP. */
async function oauthTokens(user: { jwt: string }, scope = 'planii:read planii:write planii:delete') {
  const reg = await request(app).post('/oauth/register').send({ client_name: 'Test Assistant', redirect_uris: ['https://assistant.example/cb'] })
  expect(reg.status).toBe(201)
  const clientId = reg.body.client_id as string
  const { verifier, challenge } = pkce()
  const params = { client_id: clientId, redirect_uri: 'https://assistant.example/cb', response_type: 'code', scope, state: 'xyz', code_challenge: challenge, code_challenge_method: 'S256', resource: O.mcpResourceUrl() }
  const dec = await request(app).post('/api/oauth/authorize/decision').set('Authorization', 'Bearer ' + user.jwt).send({ params, approve: true, scopes: scope.split(' ') })
  expect(dec.status).toBe(200)
  const url = new URL(dec.body.redirectTo)
  expect(url.searchParams.get('state')).toBe('xyz')
  const code = url.searchParams.get('code')!
  const tok = await request(app).post('/oauth/token').type('form').send({ grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: params.redirect_uri, code_verifier: verifier, resource: O.mcpResourceUrl() })
  expect(tok.status).toBe(200)
  return { ...tok.body, clientId, code, verifier, params } as { access_token: string; refresh_token: string; clientId: string; code: string; verifier: string; scope: string; params: typeof params }
}

async function mcpClient(accessToken: string) {
  const client = new Client({ name: 'planii-test-client', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp'), { requestInit: { headers: { Authorization: 'Bearer ' + accessToken } } }))
  return client
}

type ToolRes = { isError?: boolean; structuredContent?: Record<string, any>; content: { type: string; text: string }[] }
const call = async (c: Client, name: string, args: Record<string, unknown> = {}) => (await c.callTool({ name, arguments: args })) as unknown as ToolRes

describe('connecteur MCP Planii', () => {
  beforeAll(async () => {
    await new Promise<void>((r) => { server = app.listen(0, '127.0.0.1', r) })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })
  beforeEach(async () => { await resetDb(); _resetRateLimits() })

  it('expose la découverte OAuth et refuse un appel MCP sans jeton', async () => {
    if (!dbAvailable) return
    const prm = await request(app).get('/.well-known/oauth-protected-resource/mcp')
    expect(prm.body.resource).toBe(O.mcpResourceUrl())
    expect(prm.body.authorization_servers).toEqual([expect.any(String)])
    const asm = await request(app).get('/.well-known/oauth-authorization-server')
    expect(asm.body.code_challenge_methods_supported).toEqual(['S256'])
    expect(asm.body.registration_endpoint).toMatch(/\/oauth\/register$/)
    const noTok = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(noTok.status).toBe(401)
    expect(noTok.headers['www-authenticate']).toContain('resource_metadata=')
    const bad = await request(app).post('/mcp').set('Authorization', 'Bearer pla_faux').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(bad.status).toBe(401)
  })

  it('sert l’icône Planii du connecteur', async () => {
    const r = await request(app).get('/icon.png')
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toMatch(/image\/png/)
    expect((await request(app).get('/favicon.ico')).status).toBe(200)
  })

  it('exige PKCE S256, une redirect_uri enregistrée et refuse les clients confidentiels', async () => {
    if (!dbAvailable) return
    const bad = await request(app).post('/oauth/register').send({ redirect_uris: ['javascript:alert(1)'] })
    expect(bad.status).toBe(400)
    const conf = await request(app).post('/oauth/register').send({ redirect_uris: ['https://a.example/cb'], token_endpoint_auth_method: 'client_secret_basic' })
    expect(conf.status).toBe(400)
    const reg = await request(app).post('/oauth/register').send({ client_name: 'X', redirect_uris: ['https://a.example/cb'] })
    const cid = reg.body.client_id
    const { challenge } = pkce()
    const q1 = new URLSearchParams({ client_id: cid, redirect_uri: 'https://evil.example/cb', response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256' })
    const wrongUri = await request(app).get('/oauth/authorize?' + q1)
    expect(wrongUri.status).toBe(400) // jamais de redirection vers une URI non enregistrée
    const q2 = new URLSearchParams({ client_id: cid, redirect_uri: 'https://a.example/cb', response_type: 'code', code_challenge: challenge, code_challenge_method: 'plain' })
    const plain = await request(app).get('/oauth/authorize?' + q2)
    expect(plain.status).toBe(302)
    expect(plain.headers.location).toContain('error=invalid_request')
    const q3 = new URLSearchParams({ client_id: cid, redirect_uri: 'https://a.example/cb', response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', scope: 'planii:read' })
    const ok = await request(app).get('/oauth/authorize?' + q3)
    expect(ok.status).toBe(302)
    expect(ok.headers.location).toContain('/oauth/consent?')
  })

  it('échange un code une seule fois, avec le bon vérificateur PKCE', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const t = await oauthTokens(u)
    const again = await request(app).post('/oauth/token').type('form').send({ grant_type: 'authorization_code', code: t.code, client_id: t.clientId, redirect_uri: t.params.redirect_uri, code_verifier: t.verifier })
    expect(again.status).toBe(400)
    expect(again.body.error).toBe('invalid_grant')

    // mauvais vérificateur PKCE
    const reg = await request(app).post('/oauth/register').send({ redirect_uris: ['https://assistant.example/cb'] })
    const { challenge } = pkce()
    const params = { client_id: reg.body.client_id, redirect_uri: 'https://assistant.example/cb', response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256' }
    const dec = await request(app).post('/api/oauth/authorize/decision').set('Authorization', 'Bearer ' + u.jwt).send({ params, approve: true })
    const code = new URL(dec.body.redirectTo).searchParams.get('code')!
    const bad = await request(app).post('/oauth/token').type('form').send({ grant_type: 'authorization_code', code, client_id: reg.body.client_id, redirect_uri: params.redirect_uri, code_verifier: pkce().verifier })
    expect(bad.status).toBe(400)
  })

  it('refuse une autorisation sans compte Planii connecté', async () => {
    if (!dbAvailable) return
    const r = await request(app).post('/api/oauth/authorize/decision').send({ params: {}, approve: true })
    expect(r.status).toBe(401)
  })

  it('découverte des outils avec un vrai client MCP', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const c = await mcpClient((await oauthTokens(u)).access_token)
    const { tools } = await c.listTools()
    const names = tools.map((t) => t.name)
    for (const n of ['planii_get_me', 'planii_get_today', 'planii_list_projects', 'planii_create_task', 'planii_complete_task', 'planii_set_task_status', 'planii_create_appointment', 'planii_delete_task']) expect(names).toContain(n)
    const del = tools.find((t) => t.name === 'planii_delete_task')!
    expect(del.annotations?.destructiveHint).toBe(true)
    expect(tools.find((t) => t.name === 'planii_list_projects')!.annotations?.readOnlyHint).toBe(true)
    expect(c.getServerVersion()?.name).toBe('planii')
    expect(c.getServerVersion()?.icons?.[0]?.src).toMatch(/\/icon\.png$/)
    expect(c.getInstructions()).toContain('Planii')
    await c.close()
  })

  it('parcours complet : projet, tâche, statut, terminer, commenter, supprimer avec confirmation', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const c = await mcpClient((await oauthTokens(u)).access_token)

    const me = await call(c, 'planii_get_me')
    expect(me.structuredContent!.me.id).toBe(u.id)

    const proj = await call(c, 'planii_create_project', { name: 'Lancement', type: 'solo' })
    const projectId = proj.structuredContent!.project.id as string
    const detail = await call(c, 'planii_get_project', { projectId })
    expect(detail.structuredContent!.project.statuses.map((s: any) => s.key)).toContain('in_progress')

    const created = await call(c, 'planii_create_task', { projectId, title: 'Rédiger le brief', assigneeId: u.id, due: '2030-01-15', priority: 2 })
    const taskId = created.structuredContent!.task.id as string
    expect(created.structuredContent!.task.title).toBe('Rédiger le brief')

    const st = await call(c, 'planii_set_task_status', { taskId, statusKey: 'in_progress' })
    expect(st.structuredContent!.task.statusKey).toBe('in_progress')

    const upd = await call(c, 'planii_update_task', { taskId, priority: 1, description: 'À finir avant lundi' })
    expect(upd.structuredContent!.task.priority).toBe(1)

    const mine = await call(c, 'planii_list_my_tasks', { done: false })
    expect(mine.structuredContent!.tasks.map((t: any) => t.id)).toContain(taskId)

    const done = await call(c, 'planii_complete_task', { taskId })
    expect(done.structuredContent!.task.done).toBe(true)
    const cm = await call(c, 'planii_add_task_comment', { taskId, body: 'Brief rédigé avec l’assistant.' })
    expect(cm.isError).toBeFalsy()
    const full = await call(c, 'planii_get_task', { taskId })
    expect(full.structuredContent!.comments[0].body).toContain('Brief rédigé')

    const bulk = await call(c, 'planii_create_tasks_bulk', { projectId, tasks: [{ title: 'A' }, { title: 'B', due: '2030-01-20' }] })
    expect(bulk.structuredContent!.created).toBe(2)
    const list = await call(c, 'planii_list_tasks', { projectId, limit: 2 })
    expect(list.structuredContent!.tasks.length).toBe(2)
    expect(list.structuredContent!.hasMore).toBe(true)

    // suppression : refusée tant que non confirmée
    const ask = await call(c, 'planii_delete_task', { taskId })
    expect(ask.structuredContent!.needsConfirmation).toBe(true)
    expect((await q('SELECT 1 FROM tasks WHERE id=$1', [taskId])).rowCount).toBe(1)
    const del = await call(c, 'planii_delete_task', { taskId, confirm: true })
    expect(del.structuredContent!.deleted).toBe(true)
    expect((await q('SELECT 1 FROM tasks WHERE id=$1', [taskId])).rowCount).toBe(0)

    const today = await call(c, 'planii_get_today')
    expect(today.isError).toBeFalsy()
    await c.close()
  })

  it('rendez-vous : planifier, lire le planning, modifier, supprimer', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const c = await mcpClient((await oauthTokens(u)).access_token)
    const projectId = (await call(c, 'planii_create_project', { name: 'RDV', type: 'solo' })).structuredContent!.project.id
    const created = await call(c, 'planii_create_appointment', { projectId, title: 'Point hebdo', date: '2030-02-04', timeStart: '10:00', timeEnd: '10:30', participantIds: [u.id] })
    expect(created.isError).toBeFalsy()
    const apptId = created.structuredContent!.appointment.id as string
    const sched = await call(c, 'planii_get_schedule', { from: '2030-02-01', to: '2030-02-07' })
    expect(sched.structuredContent!.appointments.map((a: any) => a.title)).toContain('Point hebdo')
    const upd = await call(c, 'planii_update_appointment', { appointmentId: apptId, timeStart: '11:00', timeEnd: '11:30' })
    expect(upd.structuredContent!.appointment.timeStart).toBe('11:00')
    expect(upd.structuredContent!.appointment.title).toBe('Point hebdo') // champs non fournis conservés
    expect((await call(c, 'planii_delete_appointment', { appointmentId: apptId })).structuredContent!.needsConfirmation).toBe(true)
    expect((await call(c, 'planii_delete_appointment', { appointmentId: apptId, confirm: true })).structuredContent!.deleted).toBe(true)
    await c.close()
  })

  it('valide les entrées : date invalide, id inconnu, période trop longue', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const c = await mcpClient((await oauthTokens(u)).access_token)
    const projectId = (await call(c, 'planii_create_project', { name: 'P', type: 'solo' })).structuredContent!.project.id
    const badDate = await call(c, 'planii_create_task', { projectId, title: 'x', due: 'demain' })
    expect(badDate.isError).toBe(true)
    const unknown = await call(c, 'planii_get_task', { taskId: 'nope' })
    expect(unknown.isError).toBe(true)
    expect(unknown.content[0].text).toContain('introuvable')
    const long = await call(c, 'planii_get_schedule', { from: '2030-01-01', to: '2031-01-01' })
    expect(long.structuredContent?.error ?? long.content[0].text).toContain('trop longue')
    await c.close()
  })

  it('respecte les permissions accordées : lecture seule, pas de suppression', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const writer = await mcpClient((await oauthTokens(u, 'planii:read planii:write')).access_token)
    const projectId = (await call(writer, 'planii_create_project', { name: 'P', type: 'solo' })).structuredContent!.project.id
    const taskId = (await call(writer, 'planii_create_task', { projectId, title: 'T' })).structuredContent!.task.id
    const noDelete = await call(writer, 'planii_delete_task', { taskId, confirm: true })
    expect(noDelete.isError).toBe(true)
    expect(noDelete.content[0].text).toContain('planii:delete')
    expect((await q('SELECT 1 FROM tasks WHERE id=$1', [taskId])).rowCount).toBe(1)

    const reader = await mcpClient((await oauthTokens(u, 'planii:read')).access_token)
    expect((await call(reader, 'planii_list_projects')).isError).toBeFalsy()
    const ro = await call(reader, 'planii_create_task', { projectId, title: 'interdit' })
    expect(ro.isError).toBe(true)
    expect(ro.content[0].text).toContain('planii:write')
    await writer.close(); await reader.close()
  })

  it('isole strictement les utilisateurs : aucune donnée d’un autre compte', async () => {
    if (!dbAvailable) return
    const alice = await mkUser('Alice'), bob = await mkUser('Bob')
    const a = await mcpClient((await oauthTokens(alice)).access_token)
    const b = await mcpClient((await oauthTokens(bob)).access_token)
    const projectId = (await call(a, 'planii_create_project', { name: 'Secret', type: 'solo' })).structuredContent!.project.id
    const taskId = (await call(a, 'planii_create_task', { projectId, title: 'Confidentielle' })).structuredContent!.task.id

    expect((await call(b, 'planii_list_projects', { status: 'all' })).structuredContent!.projects).toHaveLength(0)
    for (const [name, args] of [
      ['planii_get_project', { projectId }], ['planii_list_tasks', { projectId }], ['planii_get_task', { taskId }],
      ['planii_create_task', { projectId, title: 'intrus' }], ['planii_update_task', { taskId, title: 'piraté' }],
      ['planii_complete_task', { taskId }], ['planii_add_task_comment', { taskId, body: 'hello' }],
      ['planii_delete_task', { taskId, confirm: true }], ['planii_close_project', { projectId }],
    ] as const) {
      const r = await call(b, name, args as Record<string, unknown>)
      expect(r.isError, name).toBe(true)
    }
    expect((await q('SELECT title FROM tasks WHERE id=$1', [taskId])).rows[0].title).toBe('Confidentielle')
    expect((await call(b, 'planii_get_today')).structuredContent!.dueToday).toHaveLength(0)
    await a.close(); await b.close()
  })

  it('applique les règles métier de Planii : seul le responsable coche sa tâche', async () => {
    if (!dbAvailable) return
    const alice = await mkUser('Alice'), bob = await mkUser('Bob')
    const projectId = uid(), taskId = uid()
    await q('INSERT INTO projects (id,name,type,owner_id) VALUES ($1,$2,$3,$4)', [projectId, 'Équipe', 'team', alice.id])
    await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4), ($5,$2,$6,$7)', [uid(), projectId, alice.id, 'owner', uid(), bob.id, 'member'])
    await q(`INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,'todo','À faire','#999',0,true)`, [uid(), projectId])
    await q(`INSERT INTO tasks (id,project_id,title,assignee_id,created_by,status_key) VALUES ($1,$2,'À Bob',$3,$4,'todo')`, [taskId, projectId, bob.id, alice.id])
    const a = await mcpClient((await oauthTokens(alice)).access_token)
    const refused = await call(a, 'planii_complete_task', { taskId })
    expect(refused.isError).toBe(true)
    expect(refused.content[0].text).toContain('responsable')
    const b = await mcpClient((await oauthTokens(bob)).access_token)
    expect((await call(b, 'planii_complete_task', { taskId })).structuredContent!.task.done).toBe(true)
    await a.close(); await b.close()
  })

  it('jeton expiré, puis connexion révoquée par l’utilisateur : accès coupé', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const t = await oauthTokens(u)
    const ok = await request(app).post('/mcp').set('Authorization', 'Bearer ' + t.access_token).set('Accept', 'application/json, text/event-stream').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(ok.status).toBe(200)

    await q(`UPDATE oauth_tokens SET expires_at = now() - interval '1 minute' WHERE kind='access'`)
    const expired = await request(app).post('/mcp').set('Authorization', 'Bearer ' + t.access_token).send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(expired.status).toBe(401)

    // le jeton de rafraîchissement redonne un accès valide…
    const r = await request(app).post('/oauth/token').type('form').send({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: t.clientId })
    expect(r.status).toBe(200)
    const list = await request(app).get('/api/me/ai-connections').set('Authorization', 'Bearer ' + u.jwt)
    expect(list.body.mcpUrl).toBe(O.mcpResourceUrl())
    expect(list.body.connections).toHaveLength(1)
    expect(list.body.connections[0].clientName).toBe('Test Assistant')

    // …jusqu'à révocation par l'utilisateur
    const rev = await request(app).delete('/api/me/ai-connections/' + list.body.connections[0].id).set('Authorization', 'Bearer ' + u.jwt)
    expect(rev.status).toBe(200)
    const after = await request(app).post('/mcp').set('Authorization', 'Bearer ' + r.body.access_token).send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(after.status).toBe(401)
    const refreshAfter = await request(app).post('/oauth/token').type('form').send({ grant_type: 'refresh_token', refresh_token: r.body.refresh_token, client_id: t.clientId })
    expect(refreshAfter.status).toBe(400)
  })

  it('un utilisateur ne peut pas révoquer la connexion d’un autre', async () => {
    if (!dbAvailable) return
    const alice = await mkUser('Alice'), bob = await mkUser('Bob')
    const t = await oauthTokens(alice)
    const id = (await request(app).get('/api/me/ai-connections').set('Authorization', 'Bearer ' + alice.jwt)).body.connections[0].id
    const r = await request(app).delete('/api/me/ai-connections/' + id).set('Authorization', 'Bearer ' + bob.jwt)
    expect(r.status).toBe(404)
    const still = await request(app).post('/mcp').set('Authorization', 'Bearer ' + t.access_token).set('Accept', 'application/json, text/event-stream').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(still.status).toBe(200)
  })

  it('rotation des jetons : réutiliser un ancien jeton de rafraîchissement révoque la connexion', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const t = await oauthTokens(u)
    const r1 = await request(app).post('/oauth/token').type('form').send({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: t.clientId })
    expect(r1.status).toBe(200)
    expect(r1.body.refresh_token).not.toBe(t.refresh_token)
    const replay = await request(app).post('/oauth/token').type('form').send({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: t.clientId })
    expect(replay.status).toBe(400)
    const dead = await request(app).post('/mcp').set('Authorization', 'Bearer ' + r1.body.access_token).send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    expect(dead.status).toBe(401)
  })

  it('révocation standard RFC 7009', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const t = await oauthTokens(u)
    expect((await request(app).post('/oauth/revoke').type('form').send({ token: t.refresh_token })).status).toBe(200)
    expect((await request(app).post('/mcp').set('Authorization', 'Bearer ' + t.access_token).send({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).status).toBe(401)
  })

  it('appels simultanés : tous aboutissent, sans mélange de contexte', async () => {
    if (!dbAvailable) return
    const alice = await mkUser('Alice'), bob = await mkUser('Bob')
    const a = await mcpClient((await oauthTokens(alice)).access_token)
    const b = await mcpClient((await oauthTokens(bob)).access_token)
    const results = await Promise.all([
      ...Array.from({ length: 8 }, () => call(a, 'planii_get_me')),
      ...Array.from({ length: 8 }, () => call(b, 'planii_get_me')),
    ])
    expect(results.slice(0, 8).every((r) => r.structuredContent!.me.id === alice.id)).toBe(true)
    expect(results.slice(8).every((r) => r.structuredContent!.me.id === bob.id)).toBe(true)
    await a.close(); await b.close()
  })

  it('limite le débit d’écriture par connexion', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const c = await mcpClient((await oauthTokens(u)).access_token)
    const projectId = (await call(c, 'planii_create_project', { name: 'Rate', type: 'solo' })).structuredContent!.project.id
    let limited = 0
    for (let i = 0; i < 45; i++) {
      const r = await call(c, 'planii_create_task', { projectId, title: 'T' + i })
      if (r.isError && r.content[0].text.includes('Trop d’appels')) limited++
    }
    expect(limited).toBeGreaterThan(0)
    await c.close()
  })

  it('journalise les actions de l’assistant, visibles par l’utilisateur concerné seulement', async () => {
    if (!dbAvailable) return
    const alice = await mkUser('Alice'), bob = await mkUser('Bob')
    const c = await mcpClient((await oauthTokens(alice)).access_token)
    const projectId = (await call(c, 'planii_create_project', { name: 'Audit', type: 'solo' })).structuredContent!.project.id
    await call(c, 'planii_create_task', { projectId, title: 'Tracée' })
    await call(c, 'planii_delete_task', { taskId: 'inconnu', confirm: true })
    const mine = await request(app).get('/api/me/ai-activity').set('Authorization', 'Bearer ' + alice.jwt)
    const tools = mine.body.items.map((i: any) => i.tool)
    expect(tools).toContain('planii_create_task')
    expect(mine.body.items.find((i: any) => i.tool === 'planii_create_task').write).toBe(true)
    expect(mine.body.items.find((i: any) => i.tool === 'planii_delete_task').ok).toBe(false)
    expect(mine.body.items[0].clientName).toBe('Test Assistant')
    const theirs = await request(app).get('/api/me/ai-activity').set('Authorization', 'Bearer ' + bob.jwt)
    expect(theirs.body.items).toHaveLength(0)
    await c.close()
  })

  it('les jetons ne sont jamais stockés en clair', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const t = await oauthTokens(u)
    const rows = (await q('SELECT token_hash FROM oauth_tokens')).rows.map((r) => r.token_hash)
    expect(rows).not.toContain(t.access_token)
    expect(rows).not.toContain(t.refresh_token)
    expect((await q('SELECT 1 FROM oauth_codes WHERE code_hash=$1', [t.code])).rowCount).toBe(0)
  })

  it('GET /mcp est refusé proprement (mode sans état)', async () => {
    if (!dbAvailable) return
    const u = await mkUser('Alice')
    const t = await oauthTokens(u)
    const r = await request(app).get('/mcp').set('Authorization', 'Bearer ' + t.access_token)
    expect(r.status).toBe(405)
  })
})
