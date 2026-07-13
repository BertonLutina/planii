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
exports.createInvite = createInvite;
exports.getInvite = getInvite;
exports.acceptInvite = acceptInvite;
const pool_1 = require("../db/pool");
const env_1 = require("../config/env");
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const ProjectModel = __importStar(require("../models/Project.model"));
const UserModel = __importStar(require("../models/User.model"));
const project_service_1 = require("./project.service");
const mail_service_1 = require("./mail.service");
const notification_service_1 = require("./notification.service");
async function createInvite(projectId, user, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, user.id);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au propriétaire ou leader');
    (0, project_service_1.assertProjectOpen)(p);
    const role = body.role;
    const allowed = { solo: ['client'], team: ['client', 'provider'], group: ['member'] };
    if (!role || !allowed[p.type].includes(role))
        (0, http_error_1.fail)(400, 'Rôle invalide pour ce type de projet');
    const t = (0, utils_1.newToken)();
    const expires = new Date(Date.now() + env_1.env.INVITE_DAYS * 864e5).toISOString();
    const multi = role !== 'client';
    await (0, pool_1.q)('INSERT INTO invites (token,project_id,role,email,created_by,expires_at,multi) VALUES ($1,$2,$3,$4,$5,$6,$7)', [t, p.id, role, (body.email || '').trim().toLowerCase() || null, user.id, expires, multi]);
    await (0, notification_service_1.logActivity)(p.id, user.id, 'invite_created', `a créé une invitation (${role})`);
    (async () => {
        const invitedEmail = (body.email || '').trim().toLowerCase();
        const rows = [['Projet', p.name], ['Rôle', role], invitedEmail ? ['Invité', invitedEmail] : null, ['Créé par', user.name]];
        const owner = await UserModel.findById(p.owner_id);
        if (owner && owner.email)
            await (0, mail_service_1.sendMail)(owner.email, `Invitation créée — ${p.name}`, { intro: `Un lien d'invitation (${role}) a été généré pour le projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env_1.env.webUrl });
        for (const adminEmail of env_1.env.superAdminEmails) {
            if (owner && owner.email && adminEmail === owner.email.toLowerCase())
                continue;
            await (0, mail_service_1.sendMail)(adminEmail, `Invitation créée — ${p.name}`, { intro: `${user.name} a généré un lien d'invitation (${role}) pour « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env_1.env.webUrl });
        }
    })().catch((e) => console.error('mail invite_created', e.message));
    return { token: t, link: `${env_1.env.appUrl}/invite/${t}`, role, expiresAt: expires, multi };
}
async function getInvite(token) {
    const inv = await (0, pool_1.one)('SELECT * FROM invites WHERE token=$1', [token]);
    if (!inv || inv.revoked)
        (0, http_error_1.fail)(404, 'Invitation invalide');
    if (new Date(inv.expires_at) < new Date())
        (0, http_error_1.fail)(410, 'Invitation expirée');
    if (!inv.multi && inv.uses >= 1)
        (0, http_error_1.fail)(410, 'Invitation déjà utilisée');
    const p = await ProjectModel.findById(inv.project_id);
    const inviter = await UserModel.findById(inv.created_by);
    return { project: { id: p.id, name: p.name, type: p.type }, role: inv.role, invitedBy: inviter ? inviter.name : null };
}
async function acceptInvite(token, user) {
    const inv = await (0, pool_1.one)('SELECT * FROM invites WHERE token=$1', [token]);
    if (!inv || inv.revoked)
        (0, http_error_1.fail)(404, 'Invitation invalide');
    if (new Date(inv.expires_at) < new Date())
        (0, http_error_1.fail)(410, 'Invitation expirée');
    if (!inv.multi && inv.uses >= 1)
        (0, http_error_1.fail)(410, 'Invitation déjà utilisée');
    const p = await ProjectModel.findById(inv.project_id);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    (0, project_service_1.assertProjectOpen)(p);
    if (await ProjectModel.findMembership(p.id, user.id))
        return { project: { id: p.id }, already: true, role: inv.role };
    await (0, pool_1.q)('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4) ON CONFLICT (project_id,user_id) DO NOTHING', [(0, utils_1.uid)(), p.id, user.id, inv.role]);
    await (0, pool_1.q)('UPDATE invites SET uses=uses+1 WHERE token=$1', [inv.token]);
    await (0, notification_service_1.logActivity)(p.id, user.id, 'member_joined', `${user.name} a rejoint (${inv.role})`);
    (async () => {
        const rows = [['Projet', p.name], ['Rôle', inv.role]];
        if (user.email)
            await (0, mail_service_1.sendMail)(user.email, `Bienvenue dans « ${p.name} »`, { intro: `Vous avez rejoint le projet « ${p.name} » en tant que ${inv.role}.`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env_1.env.webUrl });
        const owner = await UserModel.findById(p.owner_id);
        if (owner && owner.id !== user.id) {
            if (owner.email)
                await (0, mail_service_1.sendMail)(owner.email, `${user.name} a rejoint « ${p.name} »`, { intro: `${user.name} (${user.email}) a rejoint votre projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env_1.env.webUrl });
            await (0, notification_service_1.notify)(owner.id, 'member_joined', `${user.name} a rejoint « ${p.name} »`, `Rôle : ${inv.role}`);
        }
    })().catch((e) => console.error('mail member_joined', e.message));
    return { project: { id: p.id }, already: false, role: inv.role };
}
//# sourceMappingURL=invite.service.js.map