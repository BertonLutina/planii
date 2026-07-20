import bcrypt from 'bcryptjs'
import { uid } from '../lib/utils'
import { fail } from '../core/http-error'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'

export async function register(body: { name?: string; email?: string; password?: string; job?: string; lang?: string }) {
  const name = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  if (!name || !email || !password) fail(400, 'Nom, email et mot de passe requis')
  if (await UserModel.findByEmail(email)) fail(409, 'Cet email est déjà inscrit')
  const job = (body.job || '').trim().slice(0, 60) || null
  const lang = ['fr', 'en', 'nl', 'es', 'pt', 'it', 'el', 'ru', 'sw'].includes(body.lang || '') ? body.lang : 'fr'
  const pass_hash = await bcrypt.hash(password, 12)
  const u = { id: uid(), name, email, pass_hash, job }
  await UserModel.createUser({ id: u.id, name: u.name, email: u.email, pass_hash: u.pass_hash, job })
  try { await (await import('../db/pool')).q('UPDATE users SET lang=$1 WHERE id=$2', [lang, u.id]) } catch { /* colonne absente en test */ }
  return { token: UserView.signToken(u as UserModel.DbUser), user: u as UserModel.DbUser }
}

export async function login(body: { email?: string; password?: string }) {
  const email = (body.email || '').trim().toLowerCase()
  const u = await UserModel.findByEmail(email)
  if (!u || !(await bcrypt.compare(body.password || '', u.pass_hash)))
    fail(401, 'Identifiants incorrects')
  await UserModel.touchLastLogin(u.id)
  return { token: UserView.signToken(u), user: u }
}
