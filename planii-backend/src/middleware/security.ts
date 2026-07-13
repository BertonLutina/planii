import type { ErrorRequestHandler, RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config/env'
import { HttpError } from '../core/http-error'
import { logger } from '../logger'

export const apiRateLimit: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez plus tard.' },
})

export const authRateLimit: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion.' },
})

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    if (!res.headersSent) res.status(err.status).json({ error: err.message })
    return
  }
  logger.error({ err }, 'Erreur serveur')
  if (!res.headersSent) res.status(500).json({ error: 'Erreur serveur' })
}
