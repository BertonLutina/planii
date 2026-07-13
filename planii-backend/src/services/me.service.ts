import { q, one } from '../db/pool'
import { uid, cleanLabels, cleanColor } from '../lib/utils'
import { DEFAULT_TASK_TYPES, PROJECT_LABEL_COLORS } from '../lib/constants'
import { fail } from '../core/http-error'
import type { DbUser } from '../models/User.model'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'
import { ensureProjectLabels, defaultProjectLabelId } from './project.service'

export function getProfile(user: DbUser) {
  return user
}

export async function updateProfile(user: DbUser, body: Record<string, unknown>) {
  const first = typeof body.firstName === 'string' ? body.firstName.trim() : (user.first_name || '')
  const last = typeof body.lastName === 'string' ? body.lastName.trim() : (user.last_name || '')
  if (first.length > 60 || last.length > 60) fail(400, 'Nom trop long')
  const full = [first, last].filter(Boolean).join(' ').trim() || user.name
  const job = typeof body.job === 'string' ? (body.job.trim().slice(0, 60) || null) : (user.job || null)
  let taskTypes = UserView.taskTypesOf(user)
  if (Array.isArray(body.taskTypes)) {
    const cleaned = cleanLabels(body.taskTypes, 30, 20)
    taskTypes = cleaned.length ? cleaned : DEFAULT_TASK_TYPES
  }
  const roleLibrary = Array.isArray(body.roleLibrary) ? cleanLabels(body.roleLibrary, 40, 40) : UserView.roleLibraryOf(user)
  await UserModel.updateUser(user.id, {
    first_name: first || null,
    last_name: last || null,
    name: full,
    job,
    task_types: JSON.stringify(taskTypes),
    role_library: JSON.stringify(roleLibrary),
  })
  const u = await UserModel.findById(user.id)
  return u!
}

export async function listProjectLabels(userId: string) {
  return {
    labels: await ensureProjectLabels(userId),
    colors: UserView.projectLabelColorsOf((await UserModel.findById(userId))!),
  }
}

export async function createProjectLabel(userId: string, body: { label?: string; color?: string }) {
  const label = String(body.label || '').trim().slice(0, 28)
  if (!label) fail(400, 'Libellé requis')
  const labels = await ensureProjectLabels(userId)
  if (labels.length >= 20) fail(400, 'Maximum 20 libellés')
  if (labels.some((l) => String(l.label).toLowerCase() === label.toLowerCase())) fail(409, 'Ce libellé existe déjà')
  const color = cleanColor(body.color, PROJECT_LABEL_COLORS[labels.length % PROJECT_LABEL_COLORS.length])
  const user = await UserModel.findById(userId)
  const colors = UserView.projectLabelColorsOf(user!)
  if (!colors.some((c) => c.toLowerCase() === color.toLowerCase())) {
    await UserModel.updateUser(userId, {
      first_name: user!.first_name,
      last_name: user!.last_name,
      name: user!.name,
      job: user!.job,
      task_types: JSON.stringify(UserView.taskTypesOf(user!)),
      role_library: JSON.stringify(UserView.roleLibraryOf(user!)),
      project_label_colors: JSON.stringify(cleanLabels([...colors, color], 7, 40)),
    })
  }
  const maxPos = labels.reduce((m, l) => Math.max(m, Number(l.position) || 0), 0)
  const id = uid()
  await q('INSERT INTO project_labels (id,user_id,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,false)',
    [id, userId, label, color, maxPos + 1])
  return one('SELECT id,label,color,position,fixed FROM project_labels WHERE id=$1', [id])
}

export async function addProjectLabelColor(userId: string, body: { color?: string }) {
  const color = cleanColor(body.color, '')
  if (!color) fail(400, 'Couleur invalide')
  const user = await UserModel.findById(userId)
  const colors = cleanLabels([...UserView.projectLabelColorsOf(user!), color], 7, 40)
  await UserModel.updateUser(userId, {
    first_name: user!.first_name,
    last_name: user!.last_name,
    name: user!.name,
    job: user!.job,
    task_types: JSON.stringify(UserView.taskTypesOf(user!)),
    role_library: JSON.stringify(UserView.roleLibraryOf(user!)),
    project_label_colors: JSON.stringify(colors.filter((c) => !PROJECT_LABEL_COLORS.some((d) => d.toLowerCase() === c.toLowerCase()))),
  })
  const u = await UserModel.findById(userId)
  return UserView.projectLabelColorsOf(u!)
}

export async function removeProjectLabelColor(userId: string, colorParam: string) {
  const color = cleanColor('#' + String(colorParam || '').replace(/^#/, ''), '')
  if (!color) fail(400, 'Couleur invalide')
  if (PROJECT_LABEL_COLORS.some((c) => c.toLowerCase() === color.toLowerCase())) fail(400, 'Couleur par défaut')
  const user = await UserModel.findById(userId)
  const custom = UserView.projectLabelColorsOf(user!)
    .filter((c) => !PROJECT_LABEL_COLORS.some((d) => d.toLowerCase() === c.toLowerCase()) && c.toLowerCase() !== color.toLowerCase())
  await UserModel.updateUser(userId, {
    first_name: user!.first_name,
    last_name: user!.last_name,
    name: user!.name,
    job: user!.job,
    task_types: JSON.stringify(UserView.taskTypesOf(user!)),
    role_library: JSON.stringify(UserView.roleLibraryOf(user!)),
    project_label_colors: JSON.stringify(custom),
  })
  const u = await UserModel.findById(userId)
  return UserView.projectLabelColorsOf(u!)
}

export async function deleteProjectLabel(userId: string, labelId: string) {
  const label = await one('SELECT * FROM project_labels WHERE id=$1 AND user_id=$2', [labelId, userId])
  if (!label) fail(404, 'Libellé introuvable')
  if (label.fixed) fail(400, 'Ce libellé par défaut ne peut pas être supprimé')
  const fallback = await defaultProjectLabelId(userId)
  await q('UPDATE projects SET label_id=$1 WHERE owner_id=$2 AND label_id=$3', [fallback, userId, label.id])
  await q('DELETE FROM project_labels WHERE id=$1 AND user_id=$2', [label.id, userId])
}
