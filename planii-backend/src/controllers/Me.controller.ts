import type { Request, Response } from 'express'
import { asyncHandler, auth } from '../middleware/auth'
import * as MeService from '../services/me.service'
import * as UploadService from '../services/upload.service'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'

export const getMe = [auth, (req: Request, res: Response) => res.json({ user: UserView.toPublic(req.user!) })]

export const patchMe = [auth, asyncHandler(async (req, res) => {
  const user = await MeService.updateProfile(req.user!, req.body)
  res.json({ user: UserView.toPublic(user) })
})]

export const uploadAvatar = [
  auth,
  UploadService.imageUpload.single('file'),
  asyncHandler(async (req, res) => {
    const avatarUrl = await UploadService.setUserAvatar(req.user!.id, req.file)
    const user = await UserModel.findById(req.user!.id)
    res.json({ avatarUrl, user: UserView.toPublic(user) })
  }),
]

export const deleteAvatar = [auth, asyncHandler(async (req, res) => {
  await UploadService.clearUserAvatar(req.user!.id)
  const user = await UserModel.findById(req.user!.id)
  res.json({ ok: true, user: UserView.toPublic(user) })
})]

export const getProjectLabels = [auth, asyncHandler(async (req, res) => {
  res.json(await MeService.listProjectLabels(req.user!.id))
})]

export const createProjectLabel = [auth, asyncHandler(async (req, res) => {
  res.json({ label: await MeService.createProjectLabel(req.user!.id, req.body) })
})]

export const patchProjectLabelColors = [auth, asyncHandler(async (req, res) => {
  res.json({ colors: await MeService.addProjectLabelColor(req.user!.id, req.body) })
})]

export const deleteProjectLabelColor = [auth, asyncHandler(async (req, res) => {
  res.json({ colors: await MeService.removeProjectLabelColor(req.user!.id, req.params.color) })
})]

export const deleteProjectLabel = [auth, asyncHandler(async (req, res) => {
  await MeService.deleteProjectLabel(req.user!.id, req.params.id)
  res.json({ ok: true })
})]
