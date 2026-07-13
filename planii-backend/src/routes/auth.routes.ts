import { Router } from 'express'
import * as AuthController from '../controllers/Auth.controller'
import { authRateLimit } from '../middleware/security'

export function authRoutes() {
  const r = Router()
  r.post('/register', authRateLimit, AuthController.register)
  r.post('/login', authRateLimit, AuthController.login)
  return r
}
