"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
function loadDotEnv() {
    const envPath = path_1.default.join(__dirname, '../../.env');
    if (!fs_1.default.existsSync(envPath))
        return;
    for (const line of fs_1.default.readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env))
            process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
}
loadDotEnv();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().min(1).default('postgres://localhost:5432/planii'),
    PGSSL: zod_1.z.enum(['true', 'false']).default('false'),
    JWT_SECRET: zod_1.z.string().min(1),
    APP_URL: zod_1.z.string().url().optional(),
    APP_WEB_URL: zod_1.z.string().url().optional(),
    INVITE_DAYS: zod_1.z.coerce.number().int().positive().default(14),
    CORS_ORIGINS: zod_1.z.string().default('*'),
    SUPER_ADMIN_EMAILS: zod_1.z.string().default('berton.lutina@hotmail.com'),
    SMTP_HOST: zod_1.z.string().default('smtp.hostinger.com'),
    SMTP_PORT: zod_1.z.coerce.number().int().positive().default(465),
    SMTP_SECURE: zod_1.z.string().optional(),
    SMTP_USER: zod_1.z.string().default('info@planii.app'),
    SMTP_PASS: zod_1.z.string().default(''),
    MAIL_FROM: zod_1.z.string().optional(),
    IMAP_HOST: zod_1.z.string().default('imap.hostinger.com'),
    IMAP_PORT: zod_1.z.coerce.number().int().positive().default(993),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(100),
    AUTH_RATE_LIMIT_MAX: zod_1.z.coerce.number().int().positive().default(20),
});
const parsed = envSchema.safeParse({
    ...process.env,
    JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-me'),
});
if (!parsed.success) {
    console.error('Configuration invalide:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
const raw = parsed.data;
const port = raw.PORT;
const appUrl = (raw.APP_URL || `http://localhost:${port}`).replace(/\/$/, '');
const webUrl = (raw.APP_WEB_URL || appUrl).replace(/\/$/, '');
const smtpSecure = raw.SMTP_SECURE ? raw.SMTP_SECURE === 'true' : raw.SMTP_PORT === 465;
const corsOrigins = raw.CORS_ORIGINS === '*'
    ? '*'
    : raw.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
exports.env = {
    ...raw,
    appUrl,
    webUrl,
    smtpSecure,
    corsOrigins,
    mailFrom: raw.MAIL_FROM || `Planii <${raw.SMTP_USER}>`,
    mailOn: !!raw.SMTP_PASS,
    superAdminEmails: raw.SUPER_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    pgSsl: raw.PGSSL === 'true',
    isProd: raw.NODE_ENV === 'production',
    isTest: raw.NODE_ENV === 'test',
};
if (exports.env.isProd && exports.env.JWT_SECRET === 'dev-secret-change-me') {
    console.error('JWT_SECRET doit être défini en production.');
    process.exit(1);
}
//# sourceMappingURL=env.js.map