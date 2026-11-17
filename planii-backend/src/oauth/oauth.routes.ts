import path from 'path'
import express, { Router, type Request, type Response } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { asyncHandler, auth } from '../middleware/auth'
import { env } from '../config/env'
import * as O from './oauth.service'

const ASSETS = path.join(__dirname, '../../assets')

const limiter = (max: number, windowMs = 15 * 60 * 1000) => rateLimit({
  windowMs, max: env.isTest ? 100000 : max, standardHeaders: true, legacyHeaders: false,
  message: { error: 'too_many_requests', error_description: 'Trop de requêtes, réessayez plus tard.' },
})

/** Les clients MCP sont des serveurs (ou des outils locaux) : CORS ouvert, sans cookies. */
const openCors = cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'MCP-Protocol-Version', 'Mcp-Session-Id'], exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id'] })

function sendOAuthError(res: Response, e: unknown) {
  if (e instanceof O.OAuthError) {
    res.status(e.status).set('Cache-Control', 'no-store').json({ error: e.code, error_description: e.message })
    return
  }
  throw e
}

export function protectedResourceMetadata() {
  return {
    resource: O.mcpResourceUrl(),
    authorization_servers: [env.apiUrl],
    scopes_supported: O.ALL_SCOPES,
    bearer_methods_supported: ['header'],
    resource_name: 'Planii',
  }
}

export function authorizationServerMetadata() {
  return {
    issuer: env.apiUrl,
    authorization_endpoint: `${env.apiUrl}/oauth/authorize`,
    token_endpoint: `${env.apiUrl}/oauth/token`,
    registration_endpoint: `${env.apiUrl}/oauth/register`,
    revocation_endpoint: `${env.apiUrl}/oauth/revoke`,
    scopes_supported: O.ALL_SCOPES,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    client_id_metadata_document_supported: false,
  }
}

/** Routes à la RACINE de l'hôte API (découverte OAuth, authorize/token, icônes). Montées avant le CORS global. */
export function oauthRootRoutes() {
  const r = Router()
  r.use('/.well-known', openCors)
  r.use('/oauth', openCors)

  r.get(['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp'], (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300').json(protectedResourceMetadata())
  })
  r.get(['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration', '/.well-known/oauth-authorization-server/mcp'], (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300').json(authorizationServerMetadata())
  })

  // Icône du connecteur (favicon du domaine API : c'est ce que les assistants affichent à côté de « Planii »)
  r.get('/favicon.ico', (_req, res) => res.set('Cache-Control', 'public, max-age=86400').sendFile(path.join(ASSETS, 'favicon-32.png')))
  r.get('/icon.png', (_req, res) => res.set('Cache-Control', 'public, max-age=86400').sendFile(path.join(ASSETS, 'icon-512.png')))
  r.get('/icon-192.png', (_req, res) => res.set('Cache-Control', 'public, max-age=86400').sendFile(path.join(ASSETS, 'icon-192.png')))

  r.post('/oauth/register', limiter(20, 60 * 60 * 1000), express.json({ limit: '20kb' }), asyncHandler(async (req, res) => {
    try {
      const c = await O.registerClient(req.body || {})
      res.status(201).set('Cache-Control', 'no-store').json({
        ...c, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
        client_id_issued_at: Math.floor(Date.now() / 1000),
      })
    } catch (e) { sendOAuthError(res, e) }
  }))

  // Étape 1 : le client envoie l'utilisateur ici ; on valide, puis on l'envoie sur la page de consentement Planii.
  r.get('/oauth/authorize', limiter(120), asyncHandler(async (req: Request, res: Response) => {
    try {
      await O.validateAuthorize(req.query as Record<string, string>)
      const u = new URL(O.consentUrl())
      for (const k of ['client_id', 'redirect_uri', 'response_type', 'scope', 'state', 'code_challenge', 'code_challenge_method', 'resource']) {
        const val = req.query[k]
        if (typeof val === 'string') u.searchParams.set(k, val)
      }
      res.set('Cache-Control', 'no-store').redirect(302, u.toString())
    } catch (e) {
      if (e instanceof O.OAuthError && e.redirectable) {
        // client + redirect_uri sont valides à ce stade : l'erreur peut leur être renvoyée
        const redirectUri = String(req.query.redirect_uri)
        const state = typeof req.query.state === 'string' ? req.query.state : undefined
        return res.redirect(302, O.redirectWith(redirectUri, { error: e.code, error_description: e.message, state }))
      }
      if (e instanceof O.OAuthError) return res.status(400).type('text/plain').send(`Erreur d'autorisation : ${e.message}`)
      throw e
    }
  }))

  r.post('/oauth/token', limiter(120), express.urlencoded({ extended: false, limit: '20kb' }), express.json({ limit: '20kb' }), asyncHandler(async (req, res) => {
    try {
      const b = (req.body || {}) as Record<string, unknown>
      const grant = String(b.grant_type || '')
      let out
      if (grant === 'authorization_code') out = await O.exchangeCode(b)
      else if (grant === 'refresh_token') out = await O.refreshTokens(b)
      else throw new O.OAuthError('unsupported_grant_type', 'grant_type non pris en charge')
      res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' }).json(out)
    } catch (e) { sendOAuthError(res, e) }
  }))

  r.post('/oauth/revoke', limiter(120), express.urlencoded({ extended: false, limit: '20kb' }), express.json({ limit: '20kb' }), asyncHandler(async (req, res) => {
    const token = String((req.body || {}).token || '')
    if (token) await O.revokeToken(token)
    res.status(200).json({})
  }))

  return r
}

/** Routes sous /api, authentifiées par la session Planii normale (JWT de l'utilisateur). */
export function oauthApiRoutes() {
  const r = Router()

  // Page de consentement (web) : décrit ce que l'application demande.
  r.post('/oauth/authorize/preview', auth, asyncHandler(async (req, res) => {
    try {
      const v = await O.validateAuthorize(req.body || {})
      res.json({ clientName: v.client.client_name, scopes: v.scopes, redirectHost: new URL(v.redirectUri).host || new URL(v.redirectUri).protocol })
    } catch (e) {
      if (e instanceof O.OAuthError) return res.status(400).json({ error: e.message })
      throw e
    }
  }))

  // Décision de l'utilisateur. Renvoie l'URL de retour vers l'assistant.
  r.post('/oauth/authorize/decision', auth, asyncHandler(async (req, res) => {
    try {
      const { params, approve, scopes } = (req.body || {}) as { params?: Record<string, string>; approve?: boolean; scopes?: string[] }
      const v = await O.validateAuthorize(params || {})
      if (!approve) return res.json({ redirectTo: O.denyRedirect(v) })
      const granted = O.parseScopes(Array.isArray(scopes) ? scopes.join(' ') : v.scopes.join(' '))
      res.json({ redirectTo: await O.approveAuthorization(req.user!, v, granted) })
    } catch (e) {
      if (e instanceof O.OAuthError) return res.status(400).json({ error: e.message })
      throw e
    }
  }))

  // Gestion des connexions : liste, révocation, historique.
  r.get('/me/ai-connections', auth, asyncHandler(async (req, res) => {
    res.json({ mcpUrl: O.mcpResourceUrl(), connections: await O.listConnections(req.user!.id) })
  }))
  r.delete('/me/ai-connections/:id', auth, asyncHandler(async (req, res) => {
    const ok = await O.revokeConnection(req.user!.id, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Connexion introuvable' })
    res.json({ ok: true })
  }))
  r.get('/me/ai-activity', auth, asyncHandler(async (req, res) => {
    res.json({ items: await O.listAudit(req.user!.id, parseInt(String(req.query.limit || '50'), 10) || 50) })
  }))

  return r
}
