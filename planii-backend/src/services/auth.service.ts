import bcrypt from 'bcryptjs'
import { env } from '../config/env'
import { withTransaction } from '../db/pool'
import { fail } from '../core/http-error'
import { mt } from '../lib/mail-i18n'
import { newToken, sha256hex, uid } from '../lib/utils'
import * as PasswordResetModel from '../models/PasswordReset.model'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'
import { logger } from '../logger'
import { sendMail } from './mail.service'
import { disconnectUser } from './notification.service'

const RESET_TTL_MS = 60 * 60 * 1000
/** Un seul mail de reset par compte et par minute : empêche d'inonder la boîte d'une victime. */
const RESET_COOLDOWN_MS = 60 * 1000
const GENERIC_FORGOT = { ok: true as const }

/** Hash factice : un compte inconnu coûte autant de temps qu'un mauvais mot de passe. */
let dummyHash: Promise<string> | null = null
const getDummyHash = () => (dummyHash ??= bcrypt.hash('planii-no-such-user', 12))

/** Envoi sans attendre le SMTP : la durée de réponse ne dit pas si l'e-mail existe. */
function sendDetached(to: string, subject: string, opts: Parameters<typeof sendMail>[2]) {
  sendMail(to, subject, opts).catch((err) => logger.warn({ err }, 'Envoi du mail de compte impossible'))
}

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
  if (!u) {
    await bcrypt.compare(body.password || '', await getDummyHash())
    fail(401, 'Identifiants incorrects')
  }
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
    sendDetached(u.email, mt(lang, 'pwResetSocial.s'), {
      intro: mt(lang, 'pwResetSocial.i'),
      ctaText: mt(lang, 'cta'),
      ctaUrl: env.webUrl,
      footer: mt(lang, 'pwReset.footer'),
    })
    return GENERIC_FORGOT
  }

  const last = await PasswordResetModel.lastCreatedAt(u.id)
  if (last && Date.now() - last.getTime() < RESET_COOLDOWN_MS) return GENERIC_FORGOT

  await PasswordResetModel.purgeStale()
  await PasswordResetModel.invalidateOpen(u.id)
  const token = newToken()
  await PasswordResetModel.insert(
    uid(),
    u.id,
    sha256hex(token),
    new Date(Date.now() + RESET_TTL_MS),
  )
  const ctaUrl = `${env.webUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`
  sendDetached(u.email, mt(lang, 'pwReset.s'), {
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
  const pass_hash = await bcrypt.hash(password, 12)
  const userId = await withTransaction(async (client) => {
    const consumed = await client.query<{ user_id: string }>(
      `UPDATE password_reset_tokens
          SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`,
      [sha256hex(token)],
    )
    const hit = consumed.rows[0]
    if (!hit) return null
    await client.query(
      'UPDATE users SET pass_hash = $1, session_epoch = session_epoch + 1 WHERE id = $2',
      [pass_hash, hit.user_id],
    )
    await client.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
      [hit.user_id],
    )
    return hit.user_id
  })
  if (!userId) fail(400, 'Lien invalide ou expiré')
  disconnectUser(userId)
  // Alerte « ce n'était pas vous ? » : un reset légitime ou un détournement de boîte mail se voit.
  const owner = await UserModel.findById(userId)
  if (owner) {
    const lang = owner.lang || 'fr'
    sendDetached(owner.email, mt(lang, 'pwChanged.s'), {
      intro: mt(lang, 'pwChanged.i'),
      ctaText: mt(lang, 'cta'),
      ctaUrl: env.webUrl,
      footer: mt(lang, 'pwChanged.footer'),
    })
  }
  return { ok: true as const }
}
