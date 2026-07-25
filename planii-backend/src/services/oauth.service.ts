import { uid } from '../lib/utils'
import { fail } from '../core/http-error'
import { one, q } from '../db/pool'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'
import { env } from '../config/env'

export type OAuthProvider = 'google' | 'microsoft' | 'linkedin' | 'yahoo'

export type OAuthProfile = {
  provider: OAuthProvider | string
  subject: string
  email: string
  name: string
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}

/** Find by provider subject, else auto-link by email, else create user. */
export async function loginWithOAuth(profile: OAuthProfile) {
  const email = (profile.email || '').trim().toLowerCase()
  if (!email) fail(400, 'Email requis depuis le fournisseur')
  if (!profile.subject) fail(400, 'Identifiant fournisseur manquant')

  const existingId = await one<{ user_id: string }>(
    'SELECT user_id FROM user_identities WHERE provider=$1 AND subject=$2',
    [profile.provider, profile.subject],
  )
  if (existingId) {
    const u = await UserModel.findById(existingId.user_id)
    if (!u) fail(500, 'Compte lié introuvable')
    await UserModel.touchLastLogin(u.id)
    return { token: UserView.signToken(u), user: u }
  }

  let user = await UserModel.findByEmail(email)
  if (!user) {
    const id = uid()
    const name = (profile.name || email.split('@')[0] || 'Utilisateur').trim().slice(0, 120)
    await UserModel.createUser({
      id,
      name,
      email,
      pass_hash: null,
      job: null,
      first_name: profile.firstName || null,
      last_name: profile.lastName || null,
      avatar_url: profile.avatarUrl || null,
    })
    user = await UserModel.findById(id)
  } else {
    // Auto-link existing password account
    if (!user.avatar_url && profile.avatarUrl) {
      await q('UPDATE users SET avatar_url=$1 WHERE id=$2', [profile.avatarUrl, user.id])
      user = await UserModel.findById(user.id) || user
    }
  }
  if (!user) fail(500, 'Création utilisateur échouée')

  await q(
    'INSERT INTO user_identities (id, user_id, provider, subject, email) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider, subject) DO NOTHING',
    [uid(), user.id, profile.provider, profile.subject, email],
  )
  await UserModel.touchLastLogin(user.id)
  return { token: UserView.signToken(user), user }
}

export function oauthConfigured(provider: OAuthProvider): boolean {
  switch (provider) {
    case 'google':
      return !!(env.googleClientId && env.googleClientSecret)
    case 'microsoft':
      return !!(env.microsoftClientId && env.microsoftClientSecret)
    case 'linkedin':
      return !!(env.linkedinClientId && env.linkedinClientSecret)
    case 'yahoo':
      return !!(env.yahooClientId && env.yahooClientSecret)
    default:
      return false
  }
}

export function oauthProvidersStatus() {
  return {
    google: oauthConfigured('google'),
    microsoft: oauthConfigured('microsoft'),
    linkedin: oauthConfigured('linkedin'),
    yahoo: oauthConfigured('yahoo'),
  }
}
