import { Router, type Request, type RequestHandler, type Response } from 'express'
import jwt from 'jsonwebtoken'
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

/* ── Second canal : un cookie signé ────────────────────────────────────────
   La session Express seule ne suffit pas. `express-session` tourne ici sur son
   MemoryStore par défaut : la cible écrite par le worker qui reçoit
   `/auth/<provider>` est invisible au worker qui reçoit `/callback` dès que le
   serveur tourne en plusieurs processus, et elle est perdue à chaque
   redémarrage. Le flux retombait alors silencieusement sur le web — sur mobile,
   l'utilisateur se retrouvait dans le navigateur au lieu de revenir dans l'app.

   On double donc la session d'un cookie signé, sans état côté serveur : même
   hôte, `SameSite=Lax` (le retour du fournisseur est une navigation GET de
   premier niveau, le cookie passe), dix minutes de validité. La cible reste
   revalidée par `safeRedirect` à la lecture — le cookie ne fait que transporter,
   il n'autorise rien.                                                        */

const REDIRECT_COOKIE = 'planii_oauth_redirect'
const REDIRECT_TTL_S = 600

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax' as const,
    maxAge: REDIRECT_TTL_S * 1000,
    path: '/',
  }
}

function writeRedirectCookie(res: Response, target: string): void {
  const token = jwt.sign({ r: target }, env.JWT_SECRET, { expiresIn: REDIRECT_TTL_S })
  res.cookie(REDIRECT_COOKIE, token, cookieOptions())
}

/** Lit le cookie sans `cookie-parser` : l'en-tête brut suffit pour une clé. */
function readRedirectCookie(req: Request): string | null {
  const raw = req.headers.cookie
  if (!raw) return null
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() !== REDIRECT_COOKIE) continue
    try {
      const payload = jwt.verify(decodeURIComponent(part.slice(eq + 1).trim()), env.JWT_SECRET)
      const r = (payload as { r?: unknown }).r
      return typeof r === 'string' ? r : null
    } catch {
      return null // expiré ou falsifié : on ignore, le web reprend la main
    }
  }
  return null
}

/** Cible de retour retenue pour cette requête, web par défaut.
 *  Session d'abord, cookie ensuite — les deux sont à usage unique. */
function redirectTarget(req: Request, res: Response): string {
  const stored = req.session?.oauthRedirect
  if (stored) {
    // Usage unique : une session réutilisée ne doit pas rejouer l'ancienne cible.
    delete req.session.oauthRedirect
  }
  const fromCookie = readRedirectCookie(req)
  if (fromCookie) res.clearCookie(REDIRECT_COOKIE, { path: '/' })

  const ok = safeRedirect(stored) || safeRedirect(fromCookie)
  return ok || `${env.webUrl.replace(/\/$/, '')}/`
}

/** Mémorise la cible demandée, puis lance l'autorisation du fournisseur. */
function oauthStartHandler(provider: OAuthProvider): RequestHandler {
  return (req, res, next) => {
    const wanted = safeRedirect(req.query.redirect)
    if (req.session) {
      if (wanted) req.session.oauthRedirect = wanted
      else delete req.session.oauthRedirect
    }
    if (wanted) writeRedirectCookie(res, wanted)
    else res.clearCookie(REDIRECT_COOKIE, { path: '/' })
    passport.authenticate(provider, { session: true })(req, res, next)
  }
}

function oauthCallbackHandler(provider: OAuthProvider): RequestHandler {
  return (req, res, next) => {
    passport.authenticate(provider, { session: false }, (err: unknown, result: OAuthAuthResult | false) => {
      const target = redirectTarget(req, res)
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
