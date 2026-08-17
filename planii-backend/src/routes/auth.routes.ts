import { Router, type Request, type RequestHandler } from 'express'
import passport from 'passport'
import * as AuthController from '../controllers/Auth.controller'
import { authRateLimit } from '../middleware/security'
import { validate } from '../middleware/validate'
import { registerSchema, loginSchema } from '../schemas'
import { env } from '../config/env'
import type { OAuthAuthResult } from '../auth/passport'
import { oauthConfigured, oauthProvidersStatus, type OAuthProvider } from '../services/oauth.service'

const OAUTH_PROVIDERS: OAuthProvider[] = ['google', 'microsoft', 'linkedin', 'yahoo']

/* ── Retour OAuth : web et mobile ──────────────────────────────────────────
   Le web revient sur `env.webUrl`. L'app mobile, elle, ouvre l'autorisation
   dans un navigateur système (`openAuthSessionAsync`) qui ne se referme que
   lorsqu'il atteint son propre schéma : renvoyée sur la page web, la session
   resterait ouverte indéfiniment. Le client passe donc `?redirect=planii://…`
   à l'étape d'autorisation, et on le lui rend au retour.

   La cible transite par la session Express, pas par le paramètre `state` :
   LinkedIn et Yahoo (passport-oauth2 avec `state: true` + PKCE) s'y réservent
   déjà `state`, et un `state` fabriqué par l'appelant serait une porte ouverte
   à la redirection arbitraire. La session est de toute façon indispensable au
   round-trip de ces deux fournisseurs — on ne dégrade donc rien.           */

const APP_SCHEME = 'planii'

declare module 'express-session' {
  interface SessionData {
    /** Cible de retour demandée à l'étape d'autorisation (déjà validée). */
    oauthRedirect?: string
  }
}

/** N'accepte qu'une cible connue : le web configuré, le schéma natif de
 *  l'app, et `exp://` hors production (Expo Go). Tout le reste est ignoré,
 *  ce qui fait retomber le flux sur le comportement web d'origine. */
export function safeRedirect(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null
  let u: URL
  try { u = new URL(raw) } catch { return null }

  if (u.protocol === `${APP_SCHEME}:`) return u.toString()
  if (!env.isProd && u.protocol === 'exp:') return u.toString()

  try {
    const web = new URL(env.webUrl)
    if (u.protocol === web.protocol && u.host === web.host) return u.toString()
  } catch { /* webUrl mal formée : on s'en tient aux schémas natifs */ }

  return null
}

/** Ajoute un paramètre de requête sans écraser ceux déjà présents. */
function withParam(target: string, key: string, value: string): string {
  const sep = target.includes('?') ? '&' : '?'
  return `${target}${sep}${key}=${encodeURIComponent(value)}`
}

/** Cible de retour retenue pour cette requête, web par défaut. */
function redirectTarget(req: Request): string {
  const stored = req.session?.oauthRedirect
  if (stored) {
    // Usage unique : une session réutilisée ne doit pas rejouer l'ancienne cible.
    delete req.session.oauthRedirect
    const ok = safeRedirect(stored)
    if (ok) return ok
  }
  return `${env.webUrl.replace(/\/$/, '')}/`
}

/** Mémorise la cible demandée, puis lance l'autorisation du fournisseur. */
function oauthStartHandler(provider: OAuthProvider): RequestHandler {
  return (req, res, next) => {
    const wanted = safeRedirect(req.query.redirect)
    if (req.session) {
      if (wanted) req.session.oauthRedirect = wanted
      else delete req.session.oauthRedirect
    }
    passport.authenticate(provider, { session: true })(req, res, next)
  }
}

function oauthCallbackHandler(provider: OAuthProvider): RequestHandler {
  return (req, res, next) => {
    passport.authenticate(provider, { session: false }, (err: unknown, result: OAuthAuthResult | false) => {
      const target = redirectTarget(req)
      if (err || !result) {
        return res.redirect(withParam(target, 'authError', provider))
      }
      return res.redirect(withParam(target, 'oauth_token', result.token))
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
    r.get(`/${provider}`, authRateLimit, oauthStartHandler(provider))
    r.get(`/${provider}/callback`, authRateLimit, oauthCallbackHandler(provider))
  }

  return r
}
