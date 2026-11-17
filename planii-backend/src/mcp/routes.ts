import express, { Router, type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { env } from '../config/env'
import { logger } from '../logger'
import { verifyAccessToken, type McpPrincipal } from '../oauth/oauth.service'
import { createMcpServer } from './server'

declare module 'express-serve-static-core' {
  interface Request { mcp?: McpPrincipal }
}

const metadataUrl = () => `${env.apiUrl}/.well-known/oauth-protected-resource/mcp`

/** Compte seulement les échecs d'authentification par IP (les assistants partagent des IP : on ne limite pas les succès). */
const authFailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: env.isTest ? 100000 : 60, skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives invalides.' },
})

async function bearer(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : ''
  const principal = token ? await verifyAccessToken(token).catch(() => null) : null
  if (!principal) {
    // RFC 9728 : indique au client où trouver les métadonnées OAuth pour lancer la connexion.
    res.set('WWW-Authenticate', `Bearer resource_metadata="${metadataUrl()}"${token ? ', error="invalid_token"' : ''}`)
    return res.status(401).json({ error: token ? 'invalid_token' : 'unauthorized', error_description: 'Connexion Planii requise' })
  }
  req.mcp = principal
  next()
}

export function mcpRoutes() {
  const r = Router()
  r.use('/mcp', cors({
    origin: '*', methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'MCP-Protocol-Version', 'Mcp-Session-Id', 'Accept'],
    exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id'],
  }))

  r.post('/mcp', authFailLimiter, bearer, express.json({ limit: '1mb' }), async (req: Request, res: Response) => {
    const server = createMcpServer(req.mcp!)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    res.on('close', () => { transport.close().catch(() => {}); server.close().catch(() => {}) })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (e) {
      logger.error({ err: e }, 'Erreur transport MCP')
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Erreur interne' }, id: null })
    }
  })

  // Mode sans état : pas de flux serveur→client ni de session à fermer.
  const notAllowed = (_req: Request, res: Response) => {
    res.set('Allow', 'POST').status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Méthode non autorisée : utilisez POST' }, id: null })
  }
  r.get('/mcp', notAllowed)
  r.delete('/mcp', notAllowed)
  return r
}
