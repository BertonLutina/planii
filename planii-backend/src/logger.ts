import pino from 'pino'
import { env } from './config/env'

export const logger = pino({
  // Jamais de jetons ni de cookies dans les logs (JWT Planii, jetons MCP).
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'], censor: '[redacted]' },
  level: env.isTest ? 'silent' : env.isProd ? 'info' : 'debug',
  transport: env.isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } },
})
