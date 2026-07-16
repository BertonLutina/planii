import { Router } from 'express'
import * as AuthController from '../controllers/Auth.controller'
import { authRateLimit } from '../middleware/security'
import { validate } from '../middleware/validate'
import { registerSchema, loginSchema } from '../schemas'

export function authRoutes() {
  const r = Router()
  r.post('/register', authRateLimit, validate(registerSchema), AuthController.register)
  r.post('/login', authRateLimit, validate(loginSchema), AuthController.login)
  return r
}
