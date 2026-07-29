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
exports.mailLayout = mailLayout;
exports.wantsEmailNotif = wantsEmailNotif;
exports.sendMail = sendMail;
exports.sendRaw = sendRaw;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../logger");
const constants_1 = require("../lib/constants");
const UserModel = __importStar(require("../models/User.model"));
const mailEsc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mailLayout({ title, intro, rows = [], ctaText, ctaUrl, footer }) {
    const rowsHtml = rows.filter(Boolean).map((r) => `<tr><td style="padding:6px 0;color:#6b6a63;font-size:13px;width:130px;vertical-align:top">${mailEsc(r[0])}</td><td style="padding:6px 0;color:#26251f;font-size:14px;font-weight:600">${mailEsc(r[1])}</td></tr>`).join('');
    const cta = ctaText && ctaUrl
        ? `<a href="${mailEsc(ctaUrl)}" style="display:inline-block;margin-top:18px;background:#534AB7;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px">${mailEsc(ctaText)}</a>`
        : '';
    return `<!doctype html><html><body style="margin:0;background:#faf9f5;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e3da;border-radius:14px;overflow:hidden"><tr><td style="background:#534AB7;padding:16px 22px;color:#fff;font-size:18px;font-weight:700">Planii</td></tr><tr><td style="padding:22px"><div style="font-size:17px;font-weight:700;color:#26251f;margin-bottom:8px">${mailEsc(title)}</div>${intro ? `<div style="font-size:14px;color:#3f3e39;line-height:1.55;margin-bottom:14px">${mailEsc(intro)}</div>` : ''}${rowsHtml ? `<table role="presentation" style="width:100%;border-top:1px solid #f0eee7;border-bottom:1px solid #f0eee7;margin:4px 0">${rowsHtml}</table>` : ''}${cta}</td></tr><tr><td style="padding:14px 22px;color:#93918a;font-size:12px;border-top:1px solid #f0eee7">${mailEsc(footer || 'Vous recevez cet e-mail car vous utilisez Planii.')}</td></tr></table></body></html>`;
}
const mailer = env_1.env.mailOn
    ? nodemailer_1.default.createTransport({
        host: env_1.env.SMTP_HOST,
        port: env_1.env.SMTP_PORT,
        secure: env_1.env.smtpSecure,
        auth: { user: env_1.env.SMTP_USER, pass: env_1.env.SMTP_PASS },
    })
    : null;
if (env_1.env.mailOn) {
    logger_1.logger.info(`Mailer activé (${env_1.env.SMTP_HOST}:${env_1.env.SMTP_PORT}, exp. ${env_1.env.SMTP_USER})`);
}
else {
    logger_1.logger.info('Mailer désactivé (SMTP_PASS absent).');
}
/** Pref absente ou true → envoi ; false → skip. Destinataire inconnu → envoi. */
function wantsEmailNotif(prefs, key) {
    if (!constants_1.EMAIL_NOTIF_KEYS.includes(key))
        return true;
    if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs))
        return true;
    return prefs[key] !== false;
}
async function sendMail(to, subject, layoutOpts, notif) {
    if (!env_1.env.mailOn || !to || !mailer)
        return;
    if (notif) {
        let prefs = notif.prefs;
        if (prefs === undefined) {
            const u = notif.userId
                ? await UserModel.findById(notif.userId)
                : await UserModel.findByEmail(to.toLowerCase());
            prefs = u?.email_notifs;
        }
        if (!wantsEmailNotif(prefs, notif.key))
            return;
    }
    try {
        await mailer.sendMail({
            from: env_1.env.mailFrom,
            to,
            subject,
            html: mailLayout({ title: subject, ...layoutOpts }),
            text: layoutOpts.intro || subject,
        });
    }
    catch (e) {
        logger_1.logger.error({ err: e }, 'Échec envoi mail');
    }
}
async function sendRaw({ to, subject, text, inReplyTo }) {
    if (!env_1.env.mailOn || !mailer)
        throw new Error('Mail non configuré');
    const opts = { from: env_1.env.mailFrom, to, subject, text };
    if (inReplyTo) {
        opts.inReplyTo = inReplyTo;
        opts.references = inReplyTo;
    }
    await mailer.sendMail(opts);
}
//# sourceMappingURL=mail.service.js.map