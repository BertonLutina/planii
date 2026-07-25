declare module 'passport-microsoft' {
  import type { Strategy as PassportStrategy } from 'passport'
  import type { VerifyCallback } from 'passport-oauth2'

  export interface MicrosoftProfile {
    id: string
    displayName?: string
    emails?: Array<{ value?: string; type?: string }>
    name?: { givenName?: string; familyName?: string }
    photos?: Array<{ value?: string }>
    userPrincipalName?: string
  }

  export interface MicrosoftStrategyOptions {
    clientID: string
    clientSecret: string
    callbackURL: string
    scope?: string[]
    tenant?: string
    authorizationURL?: string
    tokenURL?: string
  }

  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: MicrosoftProfile,
    done: VerifyCallback,
  ) => void

  export class Strategy extends PassportStrategy {
    constructor(options: MicrosoftStrategyOptions, verify: VerifyFunction)
    name: string
  }
}
