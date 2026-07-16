import { Router } from 'express'
import * as AppointmentController from '../controllers/Appointment.controller'
import { validate } from '../middleware/validate'
import { appointmentCreateSchema, appointmentUpdateSchema } from '../schemas'

export function appointmentRoutes() {
  const r = Router()
  r.get('/projects/:id/appointments', ...AppointmentController.list)
  r.post('/projects/:id/appointments', validate(appointmentCreateSchema), ...AppointmentController.create)
  r.patch('/appointments/:id', validate(appointmentUpdateSchema), ...AppointmentController.update)
  r.delete('/appointments/:id', ...AppointmentController.remove)
  return r
}
