import fs from 'fs'
import path from 'path'
import { z } from 'zod'

function loadDotEnv() {
  const envPath = path.join(__dirname, '../../.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim()
  }
}

loadDotEnv()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default('postgres://localhost:5432/planii'),
  PGSSL: z.enum(['true', 'false']).default('false'),
  JWT_SECRET: z.string().min(1),
  APP_URL: z.string().url().optional(),
  APP_WEB_URL: z.string().url().optional(),
  INVITE_DAYS: z.coerce.number().int().positive().default(14),
  CORS_ORIGINS: z.string().default('https://planii.app,https://www.planii.app'),
  SUPER_ADMIN_EMAILS: z.string().default('berton.lutina@hotmail.com'),
  SMTP_HOST: z.string().default('smtp.hostinger.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().default('info@planii.app'),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().optional(),
  IMAP_HOST: z.string().default('imap.hostinger.com'),
  IMAP_PORT: z.coerce.number().int().positive().default(993),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
})

const parsed = envSchema.safeParse({
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-me'),
})

if (!parsed.success) {
  console.error('Configuration invalide:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const raw = parsed.data
const port = raw.PORT
const appUrl = (raw.APP_URL || `http://localhost:${port}`).replace(/\/$/, '')
const webUrl = (raw.APP_WEB_URL || appUrl).replace(/\/$/, '')
const smtpSecure = raw.SMTP_SECURE ? raw.SMTP_SECURE === 'true' : raw.SMTP_PORT === 465
const PROD_ORIGINS = ['https://planii.app', 'https://www.planii.app']
// Sécurité : le wildcard '*' n'est jamais autorisé en production. En dev il reste
// permissif ; en prod il retombe sur les domaines Planii connus. Une valeur explicite
// (liste séparée par des virgules) est toujours respectée.
const corsOrigins = raw.CORS_ORIGINS === '*'
  ? (raw.NODE_ENV === 'production' ? PROD_ORIGINS : '*')
  : raw.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)

export const env = {
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
}

if (env.isProd && env.JWT_SECRET === 'dev-secret-change-me') {
  console.error('JWT_SECRET doit être défini en production.')
  process.exit(1)
}
