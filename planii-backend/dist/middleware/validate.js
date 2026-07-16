"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
/** Middleware de validation d'entrée. Valide (et nettoie) req.body contre un schéma
 *  zod. En cas d'échec, répond 400 avec un message clair sans exécuter le controller.
 *  Les schémas utilisent .passthrough() : les champs non modélisés passent tels quels,
 *  ce qui garantit qu'aucune requête légitime n'est cassée. */
function validate(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body ?? {});
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const path = issue?.path?.join('.') || 'requête';
            res.status(400).json({ error: `Entrée invalide (${path}) : ${issue?.message || 'données malformées'}` });
            return;
        }
        req.body = parsed.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map