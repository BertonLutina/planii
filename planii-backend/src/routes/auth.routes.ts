import { Router, type RequestHandler } from 'express'
import passport from 'passport'
import * as AuthController from '../controllers/Auth.controller'
import { authRateLimit } from '../middleware/security'
import { validate } from '../middleware/validate'
import { registerSchema, loginSchema } from '../schemas'
import { env } from '../config/env'
import type { OAuthAuthResult } from '../auth/passport'
import { oauthConfigured, oauthProvidersStatus, type OAuthProvider } from '../services/oauth.service'

const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'microsoft', 'linkedin', 'yahoo']

function oauthCallbackHandler(provider: OAuthProvider): RequestHandler {
  return (req, res, next) => {
    passport.authenticate(provider, { session: false }, (err: unknown, result: OAuthAuthResult | false) => {
      if (err || !result) {
        return res.redirect(`${env.webUrl.replace(/\/$/, '')}/?authError=${provider}`)
      }
      const token = encodeURIComponent(result.token)
      return res.redirect(`${env.webUrl.replace(/\/$/, '')}/?oauth_token=${token}`)
    })(req, res, next)
  }
}

export function authRoutes() {
  const r = Router()
  r.post('/register', authRateLimit, validate(registerSchema), AuthController.register)
  r.post('/login', authRateLimit, validate(loginSchema), AuthController.login)

  r.get('/providers', (_req, res) => {
    res.json(oauthProvidersStatus())
  })

  for (const provider of OAUTH_PROVIDERS) {
    if (!oauthConfigured(provider)) continue
    r.get(
      `/${provider}`,
      authRateLimit,
      passport.authenticate(provider, { session: true }),
    )
    r.get(`/${provider}/callback`, authRateLimit, oauthCallbackHandler(provider))
  }

  return r
}
