import { Router } from 'express'
import * as MeController from '../controllers/Me.controller'

export function meRoutes() {
  const r = Router()
  r.get('/me', ...MeController.getMe)
  r.patch('/me', ...MeController.patchMe)
  r.get('/project-labels', ...MeController.getProjectLabels)
  r.post('/project-labels', ...MeController.createProjectLabel)
  r.patch('/project-label-colors', ...MeController.patchProjectLabelColors)
  r.delete('/project-label-colors/:color', ...MeController.deleteProjectLabelColor)
  r.delete('/project-labels/:id', ...MeController.deleteProjectLabel)
  return r
}
