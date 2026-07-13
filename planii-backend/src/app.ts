import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { env } from './config/env'
import { logger } from './logger'
import { apiRateLimit, errorHandler } from './middleware/security'
import { apiRoutes } from './routes'

export function createApp() {
  const app = express()

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
