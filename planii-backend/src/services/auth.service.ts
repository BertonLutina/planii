import bcrypt from 'bcryptjs'
import { env } from '../config/env'
import { fail } from '../core/http-error'
import { mt } from '../lib/mail-i18n'
import { newToken, sha256hex, uid } from '../lib/utils'
import * as PasswordResetModel from '../models/PasswordReset.model'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'
import { sendMail } from './mail.service'

const RESET_TTL_MS = 60 * 60 * 1000
const GENERIC_FORGOT = { ok: true as const }

export async function register(body: { name?: string; email?: string; password?: string; job?: string; lang?: string; country?: string }) {
  const name = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  if (!name || !email || !password) fail(400, 'Nom, email et mot de passe requis')
  if (await UserModel.findByEmail(email)) fail(409, 'Cet email est déjà inscrit')
  const job = (body.job || '').trim().slice(0, 60) || null
  const lang = ['fr', 'en', 'nl', 'es', 'pt', 'it', 'el', 'ru', 'sw'].includes(body.lang || '') ? body.lang : 'fr'
  const country = String(body.country || '').trim().toLowerCase().slice(0, 2) || null
  const pass_hash = await bcrypt.hash(password, 12)
  const u = { id: uid(), name, email, pass_hash, job }
  await UserModel.createUser({ id: u.id, name: u.name, email: u.email, pass_hash: u.pass_hash, job })
  try {
    await (await import('../db/pool')).q(
      'UPDATE users SET lang=$1, country=$2 WHERE id=$3',
      [lang, country, u.id],
    )
  } catch { /* colonnes absentes en test / ancienne base */ }
  return { token: UserView.signToken(u as UserModel.DbUser), user: u as UserModel.DbUser }
}

export async function login(body: { email?: string; password?: string }) {
  const email = (body.email || '').trim().toLowerCase()
  const u = await UserModel.findByEmail(email)
  if (!u) fail(401, 'Identifiants incorrects')
  if (!u.pass_hash) fail(401, 'Ce compte utilise une connexion sociale — choisissez Google, Outlook, etc.')
  if (!(await bcrypt.compare(body.password || '', u.pass_hash))) fail(401, 'Identifiants incorrects')
  await UserModel.touchLastLogin(u.id)
  return { token: UserView.signToken(u), user: u }
}

/** Toujours la même réponse : on ne révèle pas si l'e-mail existe. */
export async function forgotPassword(body: { email?: string }) {
  const email = (body.email || '').trim().toLowerCase()
  if (!email) return GENERIC_FORGOT
  const u = await UserModel.findByEmail(email)
  if (!u) return GENERIC_FORGOT

  const lang = u.lang || 'fr'
  if (!u.pass_hash) {
    await sendMail(u.email, mt(lang, 'pwResetSocial.s'), {
      intro: mt(lang, 'pwResetSocial.i'),
      ctaText: mt(lang, 'cta'),
      ctaUrl: env.webUrl,
      footer: mt(lang, 'pwReset.footer'),
    })
    return GENERIC_FORGOT
  }

  await PasswordResetModel.invalidateOpen(u.id)
  const token = newToken()
  await PasswordResetModel.insert(
    uid(),
    u.id,
    sha256hex(token),
    new Date(Date.now() + RESET_TTL_MS),
  )
  const ctaUrl = `${env.webUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`
  await sendMail(u.email, mt(lang, 'pwReset.s'), {
    intro: mt(lang, 'pwReset.i'),
    ctaText: mt(lang, 'pwReset.cta'),
    ctaUrl,
    footer: mt(lang, 'pwReset.footer'),
  })
  return GENERIC_FORGOT
}

export async function resetPassword(body: { token?: string; password?: string }) {
  const token = String(body.token || '').trim()
  const password = body.password || ''
  if (!token || !password) fail(400, 'Lien et mot de passe requis')
  if (password.length < 8) fail(400, 'Mot de passe trop court (8 caractères min.)')
  const row = await PasswordResetModel.findValid(sha256hex(token))
  if (!row) fail(400, 'Lien invalide ou expiré')
  const pass_hash = await bcrypt.hash(password, 12)
  await UserModel.setPasswordHash(row.user_id, pass_hash)
  await PasswordResetModel.markUsed(row.id)
  await PasswordResetModel.invalidateOpen(row.user_id)
  return { ok: true as const }
}
