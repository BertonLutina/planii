import type { DbUser } from '../models/User.model'

declare global {
  namespace Express {
    interface Request {
      user?: DbUser
    }
  }
}

export {}
