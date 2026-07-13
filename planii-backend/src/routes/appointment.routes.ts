import { Router } from 'express'
import * as AppointmentController from '../controllers/Appointment.controller'

export function appointmentRoutes() {
  const r = Router()
  r.get('/projects/:id/appointments', ...AppointmentController.list)
  r.post('/projects/:id/appointments', ...AppointmentController.create)
  r.patch('/appointments/:id', ...AppointmentController.update)
  r.delete('/appointments/:id', ...AppointmentController.remove)
  return r
}
