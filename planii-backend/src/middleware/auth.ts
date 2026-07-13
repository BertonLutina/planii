import type { Request, Response, NextFunction, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import * as UserModel from '../models/User.model'
import * as UserView from '../views/User.view'

export const asyncHandler = (fn: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || ''
  const t = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
  if (!t) return res.status(401).json({ error: 'Non authentifié' })
  try {
    const payload = jwt.verify(t, env.JWT_SECRET) as { sub: string }
    const u = await UserModel.findById(payload.sub)
    if (!u) return res.status(401).json({ error: 'Utilisateur introuvable' })
    req.user = u
    next()
  } catch {
    return res.status(401).json({ error: 'Session invalide' })
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !UserView.isAdmin(req.user)) return res.status(403).json({ error: 'Accès réservé à l’administrateur' })
  next()
}

export function superAdminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !UserView.isSuperAdmin(req.user)) return res.status(403).json({ error: 'Réservé au super administrateur' })
  next()
}
