import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { env } from './config/env'
import { logger } from './logger'
import { apiRateLimit, errorHandler } from './middleware/security'
import { apiRoutes } from './routes'

export function createApp() {
  const app = express()

  // Derrière Traefik : faire confiance au 1er proxy pour lire l'IP client réelle
  // (X-Forwarded-For). Sans ça, express-rate-limit voit tous les visiteurs comme
  // une seule IP (celle du proxy) et le quota est partagé par tout le monde.
  app.set('trust proxy', 1)

  // En-têtes de sécurité HTTP. L'API ne renvoie que du JSON : la CSP est gérée côté
  // frontend (nginx). On autorise le partage cross-origin car l'API (api.planii.app)
  // est consommée par le frontend (planii.app), et on force HSTS (6 mois).
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: { maxAge: 15552000, includeSubDomains: true },
  }))

  const corsOptions = env.corsOrigins === '*'
    ? { origin: true, credentials: true }
    : {
      origin: env.corsOrigins as string[],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }
  app.use(cors(corsOptions))
  app.options('*', cors(corsOptions))
  app.use(express.json())
  app.use(pinoHttp({ logger }))
  app.use('/api', apiRateLimit)
  app.use('/api', apiRoutes())
  app.use(errorHandler)

  return app
}
