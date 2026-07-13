import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { env } from './config/env'
import { logger } from './logger'
import { apiRateLimit, errorHandler } from './middleware/security'
import { apiRoutes } from './routes'

export function createApp() {
  const app = express()

  if (env.corsOrigins === '*') app.use(cors())
  else app.use(cors({ origin: env.corsOrigins as string[] }))
  app.use(express.json())
  app.use(pinoHttp({ logger }))
  app.use('/api', apiRateLimit)
  app.use('/api', apiRoutes())
  app.use(errorHandler)

  return app
}
