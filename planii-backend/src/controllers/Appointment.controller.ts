import { asyncHandler, auth } from '../middleware/auth'
import * as AppointmentService from '../services/appointment.service'

export const list = [auth, asyncHandler(async (req, res) => {
  res.json({ appointments: await AppointmentService.listAppointments(req.params.id, req.user!.id) })
})]

export const create = [auth, asyncHandler(async (req, res) => {
  res.json({ appointmentId: await AppointmentService.createAppointment(req.params.id, req.user!.id, req.body) })
})]

export const update = [auth, asyncHandler(async (req, res) => {
  await AppointmentService.updateAppointment(req.params.id, req.user!.id, req.body)
  res.json({ ok: true })
})]

export const remove = [auth, asyncHandler(async (req, res) => {
  await AppointmentService.deleteAppointment(req.params.id, req.user!.id)
  res.json({ ok: true })
})]
