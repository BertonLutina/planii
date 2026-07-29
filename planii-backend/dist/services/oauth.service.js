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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginWithOAuth = loginWithOAuth;
exports.oauthConfigured = oauthConfigured;
exports.oauthProvidersStatus = oauthProvidersStatus;
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const pool_1 = require("../db/pool");
const UserModel = __importStar(require("../models/User.model"));
const UserView = __importStar(require("../views/User.view"));
const env_1 = require("../config/env");
/** Find by provider subject, else auto-link by email, else create user. */
async function loginWithOAuth(profile) {
    const email = (profile.email || '').trim().toLowerCase();
    if (!email)
        (0, http_error_1.fail)(400, 'Email requis depuis le fournisseur');
    if (!profile.subject)
        (0, http_error_1.fail)(400, 'Identifiant fournisseur manquant');
    const existingId = await (0, pool_1.one)('SELECT user_id FROM user_identities WHERE provider=$1 AND subject=$2', [profile.provider, profile.subject]);
    if (existingId) {
        const u = await UserModel.findById(existingId.user_id);
        if (!u)
            (0, http_error_1.fail)(500, 'Compte lié introuvable');
        await UserModel.touchLastLogin(u.id);
        return { token: UserView.signToken(u), user: u };
    }
    let user = await UserModel.findByEmail(email);
    if (!user) {
        const id = (0, utils_1.uid)();
        const name = (profile.name || email.split('@')[0] || 'Utilisateur').trim().slice(0, 120);
        await UserModel.createUser({
            id,
            name,
            email,
            pass_hash: null,
            job: null,
            first_name: profile.firstName || null,
            last_name: profile.lastName || null,
            avatar_url: profile.avatarUrl || null,
        });
        user = await UserModel.findById(id);
    }
    else {
        // Auto-link existing password account
        if (!user.avatar_url && profile.avatarUrl) {
            await (0, pool_1.q)('UPDATE users SET avatar_url=$1 WHERE id=$2', [profile.avatarUrl, user.id]);
            user = await UserModel.findById(user.id) || user;
        }
    }
    if (!user)
        (0, http_error_1.fail)(500, 'Création utilisateur échouée');
    await (0, pool_1.q)('INSERT INTO user_identities (id, user_id, provider, subject, email) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider, subject) DO NOTHING', [(0, utils_1.uid)(), user.id, profile.provider, profile.subject, email]);
    await UserModel.touchLastLogin(user.id);
    return { token: UserView.signToken(user), user };
}
function oauthConfigured(provider) {
    switch (provider) {
        case 'google':
            return !!(env_1.env.googleClientId && env_1.env.googleClientSecret);
        case 'microsoft':
            return !!(env_1.env.microsoftClientId && env_1.env.microsoftClientSecret);
        case 'linkedin':
            return !!(env_1.env.linkedinClientId && env_1.env.linkedinClientSecret);
        case 'yahoo':
            return !!(env_1.env.yahooClientId && env_1.env.yahooClientSecret);
        default:
            return false;
    }
}
function oauthProvidersStatus() {
    return {
        google: oauthConfigured('google'),
        microsoft: oauthConfigured('microsoft'),
        linkedin: oauthConfigured('linkedin'),
        yahoo: oauthConfigured('yahoo'),
    };
}
//# sourceMappingURL=oauth.service.js.map