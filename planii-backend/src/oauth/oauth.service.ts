import crypto from 'crypto'
import { q, one, many } from '../db/pool'
import { env } from '../config/env'
import { uid, sha256hex } from '../lib/utils'
import * as UserModel from '../models/User.model'
import type { DbUser } from '../models/User.model'

/* OAuth 2.1 minimal pour le connecteur MCP de Planii.
 * - clients publics uniquement (PKCE S256 obligatoire), enregistrés par DCR (RFC 7591)
 * - code d'autorisation à usage unique, jeton d'accès court, jeton de rafraîchissement à rotation
 * - jetons liés à la ressource https://<api>/mcp (audience) et à une « connexion » révocable
 * - tout est stocké haché (SHA-256) */

export const SCOPES = {
  read: 'planii:read',
  write: 'planii:write',
  delete: 'planii:delete',
} as const
export type Scope = (typeof SCOPES)[keyof typeof SCOPES]
export const ALL_SCOPES: Scope[] = [SCOPES.read, SCOPES.write, SCOPES.delete]

export const ACCESS_TTL_S = 60 * 60 // 1 h
export const REFRESH_TTL_S = 30 * 24 * 60 * 60 // 30 jours
export const CODE_TTL_S = 10 * 60

export const mcpResourceUrl = () => `${env.apiUrl}/mcp`
export const consentUrl = () => `${env.webUrl}/oauth/consent`

/** Erreur OAuth (RFC 6749 §5.2). `redirectable` : on peut renvoyer l'erreur à la redirect_uri validée. */
export class OAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly redirectable = false,
  ) {
    super(message)
    this.name = 'OAuthError'
  }
}

/* ---------- Scopes ---------- */

/** Normalise une chaîne de scopes demandée. write/delete impliquent read. Inconnus → invalid_scope. */
export function parseScopes(raw: unknown, redirectable = false): Scope[] {
  const asked = String(raw || SCOPES.read).split(/\s+/).filter(Boolean)
  const out = new Set<Scope>()
  for (const s of asked) {
    if (!ALL_SCOPES.includes(s as Scope)) throw new OAuthError('invalid_scope', `Scope inconnu : ${s}`, 400, redirectable)
    out.add(s as Scope)
  }
  if (!out.size) out.add(SCOPES.read)
  if (out.has(SCOPES.write) || out.has(SCOPES.delete)) out.add(SCOPES.read)
  return ALL_SCOPES.filter((s) => out.has(s))
}
export const scopeString = (s: Scope[]) => s.join(' ')

/* ---------- Clients (DCR) ---------- */

function validRedirectUri(u: string): boolean {
  let url: URL
  try { url = new URL(u) } catch { return false }
  if (url.hash) return false
  if (url.protocol === 'https:') return true
  if (url.protocol === 'http:') return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  // schémas natifs (cursor://, vscode://, com.app:/cb) — jamais de schémas exécutables
  return !['javascript:', 'data:', 'file:', 'vbscript:', 'blob:', 'ftp:'].includes(url.protocol)
}

export async function registerClient(body: Record<string, unknown>) {
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : []
  if (!uris.length || uris.length > 10) throw new OAuthError('invalid_redirect_uri', 'redirect_uris requis (1 à 10)')
  if (!uris.every(validRedirectUri)) throw new OAuthError('invalid_redirect_uri', 'redirect_uri invalide')
  const method = String(body.token_endpoint_auth_method || 'none')
  if (method !== 'none') throw new OAuthError('invalid_client_metadata', 'Seuls les clients publics (token_endpoint_auth_method=none) sont acceptés')
  const name = String(body.client_name || 'Assistant IA').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80) || 'Assistant IA'
  const clientId = 'plc_' + crypto.randomBytes(16).toString('base64url')
  await q('INSERT INTO oauth_clients (client_id, client_name, redirect_uris) VALUES ($1,$2,$3)', [clientId, name, JSON.stringify(uris)])
  return { client_id: clientId, client_name: name, redirect_uris: uris }
}

export type OAuthClient = { client_id: string; client_name: string; redirect_uris: string[] }
export const getClient = (clientId: string) =>
  one<OAuthClient>('SELECT client_id, client_name, redirect_uris FROM oauth_clients WHERE client_id=$1', [clientId])

/* ---------- Autorisation ---------- */

export type AuthorizeParams = {
  client_id: string
  redirect_uri: string
  response_type: string
  scope?: string
  state?: string
  code_challenge: string
  code_challenge_method: string
  resource?: string
}

export type ValidatedAuthorize = {
  client: OAuthClient
  redirectUri: string
  scopes: Scope[]
  state?: string
  codeChallenge: string
  resource: string
}

const B64URL = /^[A-Za-z0-9_-]{43,128}$/

/** Valide la requête d'autorisation. Avant d'avoir validé client+redirect_uri, les erreurs ne sont PAS redirigeables. */
export async function validateAuthorize(p: Partial<AuthorizeParams>): Promise<ValidatedAuthorize> {
  const client = p.client_id ? await getClient(String(p.client_id)) : null
  if (!client) throw new OAuthError('invalid_client', 'Application inconnue')
  const redirectUri = String(p.redirect_uri || '')
  if (!client.redirect_uris.includes(redirectUri)) throw new OAuthError('invalid_request', 'redirect_uri non enregistrée')
  if (p.response_type !== 'code') throw new OAuthError('unsupported_response_type', 'response_type=code requis', 400, true)
  if (p.code_challenge_method !== 'S256' || !B64URL.test(String(p.code_challenge || ''))) {
    throw new OAuthError('invalid_request', 'PKCE S256 obligatoire (code_challenge, code_challenge_method=S256)', 400, true)
  }
  const resource = p.resource ? String(p.resource) : mcpResourceUrl()
  if (resource !== mcpResourceUrl()) throw new OAuthError('invalid_target', 'resource inconnue pour ce serveur', 400, true)
  const scopes = parseScopes(p.scope, true)
  return { client, redirectUri, scopes, state: p.state ? String(p.state).slice(0, 512) : undefined, codeChallenge: String(p.code_challenge), resource }
}

export function redirectWith(redirectUri: string, params: Record<string, string | undefined>) {
  const u = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, v)
  return u.toString()
}

/** L'utilisateur autorise : émet un code à usage unique. La connexion n'existe qu'à l'échange réel du code. */
export async function approveAuthorization(user: DbUser, v: ValidatedAuthorize, granted: Scope[]) {
  // Jamais plus que ce qui est demandé ; read toujours présent.
  const scopes = parseScopes(granted.filter((s) => v.scopes.includes(s)).join(' '))
  const code = 'plk_' + crypto.randomBytes(32).toString('base64url')
  await q(
    `INSERT INTO oauth_codes (code_hash,client_id,user_id,redirect_uri,scope,code_challenge,resource,expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now() + ($8 || ' seconds')::interval)`,
    [sha256hex(code), v.client.client_id, user.id, v.redirectUri, scopeString(scopes), v.codeChallenge, v.resource, String(CODE_TTL_S)],
  )
  return redirectWith(v.redirectUri, { code, state: v.state })
}

export const denyRedirect = (v: ValidatedAuthorize) =>
  redirectWith(v.redirectUri, { error: 'access_denied', error_description: 'Accès refusé par l’utilisateur', state: v.state })

/* ---------- Jetons ---------- */

async function issueTokens(connectionId: string, scopes: string) {
  const access = 'pla_' + crypto.randomBytes(32).toString('base64url')
  const refresh = 'plr_' + crypto.randomBytes(32).toString('base64url')
  await q(`INSERT INTO oauth_tokens (token_hash,kind,connection_id,expires_at) VALUES
    ($1,'access',$3, now() + ($4 || ' seconds')::interval), ($2,'refresh',$3, now() + ($5 || ' seconds')::interval)`,
    [sha256hex(access), sha256hex(refresh), connectionId, String(ACCESS_TTL_S), String(REFRESH_TTL_S)])
  return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: scopes }
}

const pkceMatches = (verifier: string, challenge: string) => {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false
  const h = crypto.createHash('sha256').update(verifier).digest('base64url')
  const a = Buffer.from(h), b = Buffer.from(challenge)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function exchangeCode(p: Record<string, unknown>) {
  const code = String(p.code || '')
  const clientId = String(p.client_id || '')
  // Consommation atomique : un code ne sert qu'une fois, même en cas d'appels simultanés.
  const row = await one<{ client_id: string; user_id: string; redirect_uri: string; scope: string; code_challenge: string; resource: string | null }>(
    `UPDATE oauth_codes SET used_at = now() WHERE code_hash=$1 AND used_at IS NULL AND expires_at > now()
     RETURNING client_id,user_id,redirect_uri,scope,code_challenge,resource`, [sha256hex(code)])
  if (!row) throw new OAuthError('invalid_grant', 'Code invalide, expiré ou déjà utilisé')
  if (row.client_id !== clientId) throw new OAuthError('invalid_grant', 'Code émis pour une autre application')
  if (row.redirect_uri !== String(p.redirect_uri || '')) throw new OAuthError('invalid_grant', 'redirect_uri différente')
  if (!pkceMatches(String(p.code_verifier || ''), row.code_challenge)) throw new OAuthError('invalid_grant', 'Vérification PKCE échouée')
  if (p.resource && String(p.resource) !== row.resource) throw new OAuthError('invalid_target', 'resource différente de celle autorisée')
  const connectionId = uid()
  await q('INSERT INTO oauth_connections (id,user_id,client_id,scope) VALUES ($1,$2,$3,$4)', [connectionId, row.user_id, row.client_id, row.scope])
  return issueTokens(connectionId, row.scope)
}

export async function refreshTokens(p: Record<string, unknown>) {
  const refresh = String(p.refresh_token || '')
  const clientId = String(p.client_id || '')
  const t = await one<{ connection_id: string; used_at: string | null; expires_at: string }>(
    `SELECT t.connection_id, t.used_at, t.expires_at FROM oauth_tokens t WHERE t.token_hash=$1 AND t.kind='refresh'`, [sha256hex(refresh)])
  if (!t) throw new OAuthError('invalid_grant', 'Jeton de rafraîchissement invalide')
  const conn = await one<{ client_id: string; scope: string; revoked_at: string | null }>(
    'SELECT client_id, scope, revoked_at FROM oauth_connections WHERE id=$1', [t.connection_id])
  if (!conn || conn.revoked_at || conn.client_id !== clientId) throw new OAuthError('invalid_grant', 'Connexion révoquée ou inconnue')
  if (t.used_at) {
    // Réutilisation d'un jeton déjà tourné : probable vol → on coupe toute la connexion.
    await revokeConnectionById(t.connection_id)
    throw new OAuthError('invalid_grant', 'Jeton déjà utilisé : la connexion a été révoquée par sécurité')
  }
  const claimed = await one(`UPDATE oauth_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now() RETURNING 1 AS ok`, [sha256hex(refresh)])
  if (!claimed) throw new OAuthError('invalid_grant', 'Jeton de rafraîchissement expiré ou déjà utilisé')
  await q(`DELETE FROM oauth_tokens WHERE connection_id=$1 AND kind='access'`, [t.connection_id])
  return issueTokens(t.connection_id, conn.scope)
}

export type McpPrincipal = {
  user: DbUser
  connectionId: string
  clientName: string
  scopes: Scope[]
}

/** Vérifie un jeton d'accès MCP. Renvoie null si invalide / expiré / révoqué / utilisateur disparu. */
export async function verifyAccessToken(token: string): Promise<McpPrincipal | null> {
  if (!token.startsWith('pla_')) return null
  const row = await one<{ connection_id: string; user_id: string; scope: string; client_name: string }>(
    `SELECT t.connection_id, c.user_id, c.scope, cl.client_name
       FROM oauth_tokens t
       JOIN oauth_connections c ON c.id = t.connection_id AND c.revoked_at IS NULL
       JOIN oauth_clients cl ON cl.client_id = c.client_id
      WHERE t.token_hash=$1 AND t.kind='access' AND t.expires_at > now()`, [sha256hex(token)])
  if (!row) return null
  const user = await UserModel.findById(row.user_id)
  if (!user) return null
  // fire-and-forget : pas d'écriture bloquante sur le chemin chaud
  q('UPDATE oauth_connections SET last_used_at=now() WHERE id=$1', [row.connection_id]).catch(() => {})
  return { user, connectionId: row.connection_id, clientName: row.client_name, scopes: parseScopes(row.scope) }
}

/** RFC 7009 : toujours réussir, même si le jeton est inconnu. */
export async function revokeToken(token: string) {
  const row = await one<{ connection_id: string }>('SELECT connection_id FROM oauth_tokens WHERE token_hash=$1', [sha256hex(token)])
  if (row) await revokeConnectionById(row.connection_id)
}

async function revokeConnectionById(id: string) {
  await q('UPDATE oauth_connections SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL', [id])
  await q('DELETE FROM oauth_tokens WHERE connection_id=$1', [id])
}

/* ---------- Gestion côté utilisateur ---------- */

export async function listConnections(userId: string) {
  const rows = await many<{ id: string; client_name: string; scope: string; created_at: string; last_used_at: string | null }>(
    `SELECT c.id, cl.client_name, c.scope, c.created_at, c.last_used_at
       FROM oauth_connections c JOIN oauth_clients cl ON cl.client_id=c.client_id
      WHERE c.user_id=$1 AND c.revoked_at IS NULL ORDER BY c.created_at DESC LIMIT 50`, [userId])
  return rows.map((r) => ({ id: r.id, clientName: r.client_name, scopes: r.scope.split(' '), createdAt: r.created_at, lastUsedAt: r.last_used_at }))
}

/** Révoque une connexion de CET utilisateur (jamais celle d'un autre). */
export async function revokeConnection(userId: string, id: string) {
  const row = await one('SELECT 1 FROM oauth_connections WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL', [id, userId])
  if (!row) return false
  await revokeConnectionById(id)
  return true
}

export async function listAudit(userId: string, limit = 50) {
  const rows = await many<{ id: string; client_name: string | null; tool: string; write: boolean; ok: boolean; detail: string | null; created_at: string }>(
    `SELECT id, client_name, tool, write, ok, detail, created_at FROM mcp_audit WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(100, Math.max(1, limit))])
  return rows.map((r) => ({ id: r.id, clientName: r.client_name, tool: r.tool, write: r.write, ok: r.ok, detail: r.detail, at: r.created_at }))
}

export async function writeAudit(p: McpPrincipal, tool: string, write: boolean, ok: boolean, detail: string) {
  try {
    await q('INSERT INTO mcp_audit (id,user_id,connection_id,client_name,tool,write,ok,detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [uid(), p.user.id, p.connectionId, p.clientName, tool, write, ok, detail.slice(0, 300)])
  } catch { /* l'audit ne doit jamais casser un appel */ }
}

/** Nettoyage périodique : codes/jetons expirés, connexions révoquées depuis longtemps, historique de plus de 6 mois. */
export async function purgeExpired() {
  await q(`DELETE FROM oauth_codes WHERE expires_at < now() - interval '1 day'`)
  await q(`DELETE FROM oauth_tokens WHERE expires_at < now() - interval '1 day'`)
  await q(`DELETE FROM oauth_connections WHERE revoked_at < now() - interval '90 days'`)
  await q(`DELETE FROM mcp_audit WHERE created_at < now() - interval '180 days'`)
}
