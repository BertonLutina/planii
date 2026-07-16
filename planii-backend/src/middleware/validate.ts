import type { RequestHandler } from 'express'
import type { ZodTypeAny } from 'zod'

/** Middleware de validation d'entrée. Valide (et nettoie) req.body contre un schéma
 *  zod. En cas d'échec, répond 400 avec un message clair sans exécuter le controller.
 *  Les schémas utilisent .passthrough() : les champs non modélisés passent tels quels,
 *  ce qui garantit qu'aucune requête légitime n'est cassée. */
export function validate(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body ?? {})
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const path = issue?.path?.join('.') || 'requête'
      res.status(400).json({ error: `Entrée invalide (${path}) : ${issue?.message || 'données malformées'}` })
      return
    }
    req.body = parsed.data
    next()
  }
}
