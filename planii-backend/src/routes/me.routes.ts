import { Router } from 'express'
import * as MeController from '../controllers/Me.controller'
import { validate } from '../middleware/validate'
import { meUpdateSchema, projectLabelSchema, labelColorsSchema } from '../schemas'

export function meRoutes() {
  const r = Router()
  r.get('/me', ...MeController.getMe)
  r.patch('/me', validate(meUpdateSchema), ...MeController.patchMe)
  r.get('/project-labels', ...MeController.getProjectLabels)
  r.post('/project-labels', validate(projectLabelSchema), ...MeController.createProjectLabel)
  r.patch('/project-label-colors', validate(labelColorsSchema), ...MeController.patchProjectLabelColors)
  r.delete('/project-label-colors/:color', ...MeController.deleteProjectLabelColor)
  r.delete('/project-labels/:id', ...MeController.deleteProjectLabel)
  return r
}
