import passport from 'passport'
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from 'passport-google-oauth20'
import { Strategy as MicrosoftStrategy } from 'passport-microsoft'
import OAuth2Strategy, { type VerifyCallback } from 'passport-oauth2'
import { env } from '../config/env'
import { loginWithOAuth, type OAuthProvider } from '../services/oauth.service'
import type { DbUser } from '../models/User.model'

export type OAuthAuthResult = { token: string; user: DbUser }

type ProfileLike = {
  id: string
  displayName?: string
  emails?: Array<{ value?: string }>
  name?: { givenName?: string; familyName?: string }
  photos?: Array<{ value?: string }>
}

/** API public origin for OAuth callbacks. */
export function apiPublicBase() {
  if (process.env.OAUTH_CALLBACK_BASE) return process.env.OAUTH_CALLBACK_BASE.replace(/\/$/, '')
  if (env.NODE_ENV !== 'production') return `http://localhost:${env.PORT}`
  return 'https://api.planii.app'
}

export function oauthCallbackURL(provider: OAuthProvider) {
  return `${apiPublicBase()}/api/auth/${provider}/callback`
}

async function finishOAuth(provider: OAuthProvider, profile: ProfileLike, done: VerifyCallback) {
  try {
    const email = profile.emails?.[0]?.value || ''
    const result = await loginWithOAuth({
      provider,
      subject: profile.id,
      email,
      name: profile.displayName || email,
      firstName: profile.name?.givenName || null,
      lastName: profile.name?.familyName || null,
      avatarUrl: profile.photos?.[0]?.value || null,
    })
    done(null, result as unknown as Express.User)
  } catch (e) {
    done(e as Error)
  }
}

/** OpenID Connect userinfo helper for LinkedIn / Yahoo. */
function oidcUserProfile(userInfoURL: string) {
  return function (this: OAuth2Strategy, accessToken: string, done: (err?: Error | null, profile?: ProfileLike) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this as any)._oauth2.get(userInfoURL, accessToken, (err: Error | null, body: string) => {
      if (err) return done(err)
      try {
        const json = JSON.parse(body) as Record<string, string>
        const email = json.email || ''
        done(null, {
          id: String(json.sub || json.id || ''),
          displayName: json.name || email,
          emails: email ? [{ value: email }] : [],
          name: { givenName: json.given_name, familyName: json.family_name },
          photos: json.picture ? [{ value: json.picture }] : [],
        })
      } catch (e) {
        done(e as Error)
      }
    })
  }
}

function registerOidcStrategy(
  name: OAuthProvider,
  opts: {
    clientID: string
    clientSecret: string
    authorizationURL: string
    tokenURL: string
    userInfoURL: string
    scope: string[]
  },
) {
  const strategy = new OAuth2Strategy(
    {
      authorizationURL: opts.authorizationURL,
      tokenURL: opts.tokenURL,
      clientID: opts.clientID,
      clientSecret: opts.clientSecret,
      callbackURL: oauthCallbackURL(name),
      scope: opts.scope,
      state: true,
      pkce: true,
    },
    (accessToken: string, refreshToken: string, profile: ProfileLike, done: VerifyCallback) => {
      void accessToken
      void refreshToken
      void finishOAuth(name, profile, done)
    },
  )
  strategy.name = name
  strategy.userProfile = oidcUserProfile(opts.userInfoURL)
  passport.use(strategy)
}

export function configurePassport() {
  if (env.googleClientId && env.googleClientSecret) {
    passport.use(new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: oauthCallbackURL('google'),
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile: GoogleProfile, done) => {
        await finishOAuth('google', profile, done as VerifyCallback)
      },
    ))
  }

  if (env.microsoftClientId && env.microsoftClientSecret) {
    passport.use(new MicrosoftStrategy(
      {
        clientID: env.microsoftClientId,
        clientSecret: env.microsoftClientSecret,
        callbackURL: oauthCallbackURL('microsoft'),
        scope: ['user.read', 'openid', 'profile', 'email'],
        tenant: 'common',
      },
      async (_accessToken: string, _refreshToken: string, profile: ProfileLike, done: VerifyCallback) => {
        await finishOAuth('microsoft', profile, done)
      },
    ))
  }

  if (env.linkedinClientId && env.linkedinClientSecret) {
    registerOidcStrategy('linkedin', {
      clientID: env.linkedinClientId,
      clientSecret: env.linkedinClientSecret,
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoURL: 'https://api.linkedin.com/v2/userinfo',
      scope: ['openid', 'profile', 'email'],
    })
  }

  if (env.yahooClientId && env.yahooClientSecret) {
    registerOidcStrategy('yahoo', {
      clientID: env.yahooClientId,
      clientSecret: env.yahooClientSecret,
      authorizationURL: 'https://api.login.yahoo.com/oauth2/request_auth',
      tokenURL: 'https://api.login.yahoo.com/oauth2/get_token',
      userInfoURL: 'https://api.login.yahoo.com/openid/v1/userinfo',
      scope: ['openid', 'profile', 'email'],
    })
  }

  passport.serializeUser((user, done) => done(null, user))
  passport.deserializeUser((user, done) => done(null, user as Express.User))
}
