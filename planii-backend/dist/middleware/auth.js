"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
exports.auth = auth;
exports.adminOnly = adminOnly;
exports.superAdminOnly = superAdminOnly;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const UserModel = __importStar(require("../models/User.model"));
const UserView = __importStar(require("../views/User.view"));
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
async function auth(req, res, next) {
    const hdr = req.headers.authorization || '';
    const t = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!t)
        return res.status(401).json({ error: 'Non authentifié' });
    try {
        const payload = jsonwebtoken_1.default.verify(t, env_1.env.JWT_SECRET);
        const u = await UserModel.findById(payload.sub);
        if (!u)
            return res.status(401).json({ error: 'Utilisateur introuvable' });
        req.user = u;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Session invalide' });
    }
}
function adminOnly(req, res, next) {
    if (!req.user || !UserView.isAdmin(req.user))
        return res.status(403).json({ error: 'Accès réservé à l’administrateur' });
    next();
}
function superAdminOnly(req, res, next) {
    if (!req.user || !UserView.isSuperAdmin(req.user))
        return res.status(403).json({ error: 'Réservé au super administrateur' });
    next();
}
//# sourceMappingURL=auth.js.map