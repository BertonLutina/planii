import { q, one } from '../db/pool'
import { env } from '../config/env'
import { uid, newToken } from '../lib/utils'
import { fail } from '../core/http-error'
import type { DbUser } from '../models/User.model'
import * as ProjectModel from '../models/Project.model'
import * as UserModel from '../models/User.model'
import { assertProjectOpen } from './project.service'
import { sendMail } from './mail.service'
import { logActivity, notify } from './notification.service'

export async function createInvite(projectId: string, user: DbUser, body: { role?: string; email?: string }) {
  const p = await ProjectModel.findById(projectId)
  if (!p) fail(404, 'Projet introuvable')
  const m = await ProjectModel.findMembership(p.id, user.id)
  if (!m || !ProjectModel.canManageRole(m.role)) fail(403, 'Réservé au propriétaire ou leader')
  assertProjectOpen(p)
  const role = body.role
  const allowed: Record<string, string[]> = { solo: ['client'], team: ['client', 'provider'], group: ['member'] }
  if (!role || !allowed[p.type].includes(role)) fail(400, 'Rôle invalide pour ce type de projet')
  const t = newToken()
  const expires = new Date(Date.now() + env.INVITE_DAYS * 864e5).toISOString()
  const multi = role !== 'client'
  await q('INSERT INTO invites (token,project_id,role,email,created_by,expires_at,multi) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [t, p.id, role, (body.email || '').trim().toLowerCase() || null, user.id, expires, multi])
  await logActivity(p.id, user.id, 'invite_created', `a créé une invitation (${role})`)
  ;(async () => {
    const invitedEmail = (body.email || '').trim().toLowerCase()
    const rows: ([string, string] | null)[] = [['Projet', p.name], ['Rôle', role], invitedEmail ? ['Invité', invitedEmail] : null, ['Créé par', user.name]]
    const owner = await UserModel.findById(p.owner_id)
    if (owner && owner.email) await sendMail(owner.email, `Invitation créée — ${p.name}`, { intro: `Un lien d'invitation (${role}) a été généré pour le projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env.webUrl })
    for (const adminEmail of env.superAdminEmails) {
      if (owner && owner.email && adminEmail === owner.email.toLowerCase()) continue
      await sendMail(adminEmail, `Invitation créée — ${p.name}`, { intro: `${user.name} a généré un lien d'invitation (${role}) pour « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env.webUrl })
    }
  })().catch((e) => console.error('mail invite_created', (e as Error).message))
  return { token: t, link: `${env.appUrl}/invite/${t}`, role, expiresAt: expires, multi }
}

export async function getInvite(token: string) {
  const inv = await one('SELECT * FROM invites WHERE token=$1', [token])
  if (!inv || inv.revoked) fail(404, 'Invitation invalide')
  if (new Date(inv.expires_at) < new Date()) fail(410, 'Invitation expirée')
  if (!inv.multi && inv.uses >= 1) fail(410, 'Invitation déjà utilisée')
  const p = await ProjectModel.findById(inv.project_id)
  const inviter = await UserModel.findById(inv.created_by)
  return { project: { id: p!.id, name: p!.name, type: p!.type }, role: inv.role, invitedBy: inviter ? inviter.name : null }
}

export async function acceptInvite(token: string, user: DbUser) {
  const inv = await one('SELECT * FROM invites WHERE token=$1', [token])
  if (!inv || inv.revoked) fail(404, 'Invitation invalide')
  if (new Date(inv.expires_at) < new Date()) fail(410, 'Invitation expirée')
  if (!inv.multi && inv.uses >= 1) fail(410, 'Invitation déjà utilisée')
  const p = await ProjectModel.findById(inv.project_id)
  if (!p) fail(404, 'Projet introuvable')
  assertProjectOpen(p)
  if (await ProjectModel.findMembership(p.id, user.id)) return { project: { id: p.id }, already: true, role: inv.role }
  await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4) ON CONFLICT (project_id,user_id) DO NOTHING', [uid(), p.id, user.id, inv.role])
  await q('UPDATE invites SET uses=uses+1 WHERE token=$1', [inv.token])
  await logActivity(p.id, user.id, 'member_joined', `${user.name} a rejoint (${inv.role})`)
  ;(async () => {
    const rows: ([string, string] | null)[] = [['Projet', p.name], ['Rôle', inv.role]]
    if (user.email) await sendMail(user.email, `Bienvenue dans « ${p.name} »`, { intro: `Vous avez rejoint le projet « ${p.name} » en tant que ${inv.role}.`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env.webUrl })
    const owner = await UserModel.findById(p.owner_id)
    if (owner && owner.id !== user.id) {
      if (owner.email) await sendMail(owner.email, `${user.name} a rejoint « ${p.name} »`, { intro: `${user.name} (${user.email}) a rejoint votre projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env.webUrl })
      await notify(owner.id, 'member_joined', `${user.name} a rejoint « ${p.name} »`, `Rôle : ${inv.role}`)
    }
  })().catch((e) => console.error('mail member_joined', (e as Error).message))
  return { project: { id: p.id }, already: false, role: inv.role }
}
