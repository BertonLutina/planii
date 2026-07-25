import type { DbUser } from '../models/User.model'

declare global {
  namespace Express {
    // Planii auth middleware attaches DbUser; OAuth uses a custom callback (not req.user).
    interface User extends DbUser {}
  }
}

export {}
