import { asyncHandler } from '../middleware/auth'
import * as AuthService from '../services/auth.service'
import * as UserView from '../views/User.view'

export const register = asyncHandler(async (req, res) => {
  const session = await AuthService.register(req.body)
  res.json(UserView.authSession(session.token, session.user))
})

export const login = asyncHandler(async (req, res) => {
  const session = await AuthService.login(req.body)
  res.json(UserView.authSession(session.token, session.user))
})
