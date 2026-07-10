/* ===== Planii backend — Express + PostgreSQL ===== */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');

// charge un fichier .env s'il existe (sans dépendance externe)
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
} catch (e) { /* ignore */ }

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const INVITE_DAYS = parseInt(process.env.INVITE_DAYS || '14', 10);
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/planii';

/* ---------- e-mails (SMTP Hostinger via nodemailer) ---------- */
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'info@planii.app';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || `Planii <${SMTP_USER}>`;
const WEB_URL = (process.env.APP_WEB_URL || APP_URL).replace(/\/$/, '');
const MAIL_ON = !!SMTP_PASS;
const mailer = MAIL_ON ? nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, auth: { user: SMTP_USER, pass: SMTP_PASS } }) : null;
console.log(MAIL_ON ? `Mailer activé (${SMTP_HOST}:${SMTP_PORT}, exp. ${SMTP_USER})` : 'Mailer désactivé (SMTP_PASS absent).');
const mailEsc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mailLayout({ title, intro, rows = [], ctaText, ctaUrl, footer }) {
  const rowsHtml = rows.filter(Boolean).map((r) =>
    `<tr><td style="padding:6px 0;color:#6b6a63;font-size:13px;width:130px;vertical-align:top">${mailEsc(r[0])}</td><td style="padding:6px 0;color:#26251f;font-size:14px;font-weight:600">${mailEsc(r[1])}</td></tr>`).join('');
  const cta = ctaText && ctaUrl ? `<a href="${mailEsc(ctaUrl)}" style="display:inline-block;margin-top:18px;background:#534AB7;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px">${mailEsc(ctaText)}</a>` : '';
  return `<!doctype html><html><body style="margin:0;background:#faf9f5;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e3da;border-radius:14px;overflow:hidden"><tr><td style="background:#534AB7;padding:16px 22px;color:#fff;font-size:18px;font-weight:700">Planii</td></tr><tr><td style="padding:22px"><div style="font-size:17px;font-weight:700;color:#26251f;margin-bottom:8px">${mailEsc(title)}</div>${intro ? `<div style="font-size:14px;color:#3f3e39;line-height:1.55;margin-bottom:14px">${mailEsc(intro)}</div>` : ''}${rowsHtml ? `<table role="presentation" style="width:100%;border-top:1px solid #f0eee7;border-bottom:1px solid #f0eee7;margin:4px 0">${rowsHtml}</table>` : ''}${cta}</td></tr><tr><td style="padding:14px 22px;color:#93918a;font-size:12px;border-top:1px solid #f0eee7">${mailEsc(footer || 'Vous recevez cet e-mail car vous utilisez Planii.')}</td></tr></table></body></html>`;
}
async function sendMail(to, subject, layoutOpts) {
  if (!MAIL_ON || !to) return;
  try { await mailer.sendMail({ from: MAIL_FROM, to, subject, html: mailLayout({ title: subject, ...layoutOpts }), text: (layoutOpts && layoutOpts.intro) || subject }); }
  catch (e) { console.error('Échec envoi mail:', e.message); }
}

/* ---------- boîte mail intégrée (IMAP lecture + SMTP composition) ---------- */
const IMAP_HOST = process.env.IMAP_HOST || 'imap.hostinger.com';
const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993', 10);
const imapClient = () => new ImapFlow({ host: IMAP_HOST, port: IMAP_PORT, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASS }, logger: false });
async function imapList(limit = 30) {
  const client = imapClient(); await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const out = [];
  try {
    const total = client.mailbox.exists || 0;
    if (total > 0) {
      const start = Math.max(1, total - limit + 1);
      for await (const m of client.fetch(`${start}:*`, { envelope: true, flags: true })) {
        const f = (m.envelope.from && m.envelope.from[0]) || {};
        out.push({ uid: m.uid, from: f.address || '', fromName: f.name || f.address || '', subject: m.envelope.subject || '(sans objet)', date: m.envelope.date, seen: m.flags ? m.flags.has('\\Seen') : true });
      }
    }
  } finally { lock.release(); await client.logout(); }
  return out.reverse();
}
async function imapRead(uid) {
  const client = imapClient(); await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  let out = null;
  try {
    const m = await client.fetchOne(String(uid), { source: true }, { uid: true });
    if (m && m.source) {
      const p = await simpleParser(m.source);
      out = { uid, from: (p.from && p.from.text) || '', to: (p.to && p.to.text) || '', subject: p.subject || '(sans objet)', date: p.date, text: p.text || '', html: p.html || '', messageId: p.messageId || '', replyTo: (p.from && p.from.value && p.from.value[0] && p.from.value[0].address) || '' };
    }
    try { await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }); } catch { /* noop */ }
  } finally { lock.release(); await client.logout(); }
  return out;
}
async function sendRaw({ to, subject, text, inReplyTo }) {
  if (!MAIL_ON) throw new Error('Mail non configuré');
  const opts = { from: MAIL_FROM, to, subject, text };
  if (inReplyTo) { opts.inReplyTo = inReplyTo; opts.references = inReplyTo; }
  await mailer.sendMail(opts);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
const q = (text, params) => pool.query(text, params);
const one = async (text, params) => (await pool.query(text, params)).rows[0] || null;
const many = async (text, params) => (await pool.query(text, params)).rows;

/* ---------- schéma (créé au démarrage) ---------- */
async function initSchema() {
  await q(`CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL,
    pass_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS job text`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS task_types jsonb`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_library jsonb`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS project_label_colors jsonb`);
  await q(`CREATE TABLE IF NOT EXISTS admin_audit (
    id text PRIMARY KEY, actor_id text, actor_name text, action text NOT NULL,
    detail text, created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE TABLE IF NOT EXISTS projects (
    id text PRIMARY KEY, name text NOT NULL, type text NOT NULL,
    owner_id text NOT NULL, status text NOT NULL DEFAULT 'active',
    deadline text, created_at timestamptz NOT NULL DEFAULT now(), done_at timestamptz);`);
  await q(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS label_id text`);
  await q(`CREATE TABLE IF NOT EXISTS project_labels (
    id text PRIMARY KEY, user_id text NOT NULL, label text NOT NULL, color text NOT NULL,
    position int NOT NULL DEFAULT 0, fixed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE TABLE IF NOT EXISTS memberships (
    id text PRIMARY KEY, project_id text NOT NULL, user_id text NOT NULL,
    role text NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id));`);
  await q(`CREATE TABLE IF NOT EXISTS tasks (
    id text PRIMARY KEY, project_id text NOT NULL, title text NOT NULL,
    assignee_id text, created_by text NOT NULL, due text,
    done boolean NOT NULL DEFAULT false, done_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS est_hours numeric`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spent_hours numeric`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 6`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id text`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type text`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position int`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_key text NOT NULL DEFAULT 'todo'`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transferred_from text`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transferred_to text`);
  await q(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS transferable boolean NOT NULL DEFAULT false`);
  await q(`CREATE TABLE IF NOT EXISTS task_transfers (
    id text PRIMARY KEY, task_id text NOT NULL, project_id text NOT NULL,
    from_user_id text, to_user_id text NOT NULL, created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS position int`);
  await q(`CREATE TABLE IF NOT EXISTS task_statuses (
    id text PRIMARY KEY, project_id text NOT NULL, key text NOT NULL, label text NOT NULL,
    color text NOT NULL DEFAULT '#9a988f', position int NOT NULL DEFAULT 0,
    fixed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, key));`);
  await q(`CREATE TABLE IF NOT EXISTS project_roles (
    id text PRIMARY KEY, project_id text NOT NULL, name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE TABLE IF NOT EXISTS member_roles (
    project_id text NOT NULL, user_id text NOT NULL, role_id text NOT NULL,
    PRIMARY KEY(project_id, user_id, role_id));`);
  await q(`CREATE TABLE IF NOT EXISTS project_meeting_task_delegates (
    project_id text NOT NULL, user_id text NOT NULL, created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(project_id, user_id));`);
  await q(`CREATE TABLE IF NOT EXISTS task_reminders (
    task_id text NOT NULL, for_date date NOT NULL, PRIMARY KEY(task_id, for_date));`);
  await q(`CREATE TABLE IF NOT EXISTS invites (
    token text PRIMARY KEY, project_id text NOT NULL, role text NOT NULL, email text,
    created_by text NOT NULL, expires_at timestamptz NOT NULL,
    multi boolean NOT NULL DEFAULT false, uses int NOT NULL DEFAULT 0, revoked boolean NOT NULL DEFAULT false);`);
  await q(`CREATE TABLE IF NOT EXISTS polls (
    id text PRIMARY KEY, project_id text NOT NULL, question text NOT NULL,
    created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), closed boolean NOT NULL DEFAULT false);`);
  await q(`CREATE TABLE IF NOT EXISTS poll_options (id text PRIMARY KEY, poll_id text NOT NULL, label text NOT NULL);`);
  await q(`CREATE TABLE IF NOT EXISTS poll_votes (
    poll_id text NOT NULL, option_id text NOT NULL, user_id text NOT NULL, PRIMARY KEY(poll_id, user_id));`);
  await q(`CREATE TABLE IF NOT EXISTS activity (
    id text PRIMARY KEY, project_id text NOT NULL, user_id text,
    type text NOT NULL, detail text, created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY, user_id text NOT NULL, type text NOT NULL,
    title text NOT NULL, detail text, read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);`);
  await q(`CREATE TABLE IF NOT EXISTS meeting_messages (
    id text PRIMARY KEY, project_id text NOT NULL, user_id text NOT NULL,
    body text NOT NULL, created_task_id text,
    created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE INDEX IF NOT EXISTS meeting_messages_project_idx ON meeting_messages (project_id, created_at ASC);`);
}

/* ---------- helpers ---------- */
const uid = () => crypto.randomBytes(9).toString('base64url');
const numOrNull = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Math.max(0, Number(v));
const prioOrDefault = (v) => { const n = parseInt(v, 10); return (n >= 1 && n <= 6) ? n : 6; };
const newToken = () => crypto.randomBytes(18).toString('base64url');
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || 'berton.lutina@hotmail.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const isSuperAdmin = (u) => !!u && SUPER_ADMIN_EMAILS.includes((u.email || '').toLowerCase());
const isAdmin = (u) => !!u && (isSuperAdmin(u) || u.is_admin === true);
const DEFAULT_TASK_TYPES = ['Tâche', 'Bug'];
const DEFAULT_PROJECT_LABELS = [
  { label: 'Travail', color: '#3b82f6', position: 0, fixed: true },
  { label: 'Privé', color: '#ef4444', position: 1, fixed: true },
];
const PROJECT_LABEL_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
const FIXED_TASK_STATUSES = [
  { key: 'todo', label: 'À faire', color: '#9a988f', position: 0, fixed: true },
  { key: 'in_progress', label: 'En cours', color: '#3b82d6', position: 1, fixed: true },
  { key: 'review', label: 'Revu', color: '#9b5de5', position: 2, fixed: true },
  { key: 'done', label: 'Terminé', color: '#4caf50', position: 99, fixed: true },
];
const DEFAULT_CUSTOM_TASK_STATUSES = [
  { key: 'transferred', label: 'Transféré', color: '#f59f30', position: 3, fixed: false },
];
const taskTypesOf = (u) => (u && Array.isArray(u.task_types) && u.task_types.length) ? u.task_types : DEFAULT_TASK_TYPES;
const roleLibraryOf = (u) => (u && Array.isArray(u.role_library)) ? u.role_library : [];
const cleanColor = (v, fallback = PROJECT_LABEL_COLORS[0]) => /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : fallback;
const projectLabelColorsOf = (u) => {
  const custom = Array.isArray(u && u.project_label_colors) ? u.project_label_colors.map((c) => cleanColor(c, '')).filter(Boolean) : [];
  return cleanLabels([...PROJECT_LABEL_COLORS, ...custom], 7, 40);
};
// Nettoie une liste de libellés : trim, longueur max, sans doublons (insensible à la casse), plafonnée.
const cleanLabels = (arr, maxLen, maxCount) => {
  const out = [];
  for (const t of arr) {
    if (typeof t !== 'string') continue;
    const v = t.trim().slice(0, maxLen);
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
    if (out.length >= maxCount) break;
  }
  return out;
};
const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, firstName: u.first_name || '', lastName: u.last_name || '', job: u.job || '', taskTypes: taskTypesOf(u), roleLibrary: roleLibraryOf(u), admin: isAdmin(u), superAdmin: isSuperAdmin(u) };
const sign = (u) => jwt.sign({ sub: u.id }, JWT_SECRET, { expiresIn: '30d' });
const canManage = (role) => role === 'owner' || role === 'lead';
const REOPEN_DAYS = 30;

const userByEmail = (e) => one('SELECT * FROM users WHERE email=$1', [e]);
const userById = (id) => one('SELECT * FROM users WHERE id=$1', [id]);
const projectById = (id) => one('SELECT * FROM projects WHERE id=$1', [id]);
const taskById = (id) => one('SELECT * FROM tasks WHERE id=$1', [id]);
const membership = (pid, uidv) => one('SELECT * FROM memberships WHERE project_id=$1 AND user_id=$2', [pid, uidv]);
const projectMembers = (pid) => many('SELECT user_id, role FROM memberships WHERE project_id=$1', [pid]);
const slugStatus = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || ('status_' + uid().slice(0, 6));
const projectClosed = (p) => p && p.status === 'done';
const reopenUntil = (p) => p && p.done_at ? new Date(new Date(p.done_at).getTime() + REOPEN_DAYS * 864e5) : null;
const canReopenProject = (p) => {
  const until = reopenUntil(p);
  return projectClosed(p) && until && until >= new Date();
};
function assertProjectOpen(p, res) {
  if (!projectClosed(p)) return false;
  res.status(423).json({ error: 'Projet clôturé : seule la réouverture ou la suppression est autorisée' });
  return true;
}

async function ensureProjectStatuses(projectId) {
  const existing = await many('SELECT key, fixed FROM task_statuses WHERE project_id=$1', [projectId]);
  const keys = new Set(existing.map((s) => s.key));
  for (const st of FIXED_TASK_STATUSES) {
    if (!keys.has(st.key)) {
      await q('INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (project_id,key) DO NOTHING',
        [uid(), projectId, st.key, st.label, st.color, st.position, st.fixed]);
    }
  }
  if (existing.length === 0) {
    for (const st of DEFAULT_CUSTOM_TASK_STATUSES) {
      await q('INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (project_id,key) DO NOTHING',
        [uid(), projectId, st.key, st.label, st.color, st.position, st.fixed]);
    }
  }
  return many('SELECT id,key,label,color,position,fixed FROM task_statuses WHERE project_id=$1 ORDER BY position ASC, label ASC', [projectId]);
}

async function ensureProjectLabels(userId) {
  const existing = await many('SELECT id,label,color,position,fixed FROM project_labels WHERE user_id=$1 ORDER BY position ASC, label ASC', [userId]);
  for (const d of DEFAULT_PROJECT_LABELS) {
    if (!existing.some((x) => String(x.label).toLowerCase() === d.label.toLowerCase())) {
      await q('INSERT INTO project_labels (id,user_id,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6)',
        [uid(), userId, d.label, d.color, d.position, d.fixed]);
    }
  }
  return many('SELECT id,label,color,position,fixed FROM project_labels WHERE user_id=$1 ORDER BY position ASC, label ASC', [userId]);
}

async function defaultProjectLabelId(userId) {
  const labels = await ensureProjectLabels(userId);
  return (labels.find((l) => String(l.label).toLowerCase() === 'travail') || labels[0]).id;
}

/* ---------- temps réel (WebSocket) ---------- */
const wsClients = new Map(); // userId -> Set<ws>
function wsSend(userId, payload) {
  const set = wsClients.get(userId); if (!set) return;
  const data = JSON.stringify(payload);
  for (const ws of set) { try { if (ws.readyState === 1) ws.send(data); } catch { /* noop */ } }
}
const notifyUser = (userId, payload) => wsSend(userId, payload);
async function notifyProject(projectId, payload) {
  try { for (const m of await projectMembers(projectId)) wsSend(m.user_id, payload); }
  catch (e) { console.error('ws project', e.message); }
}
const bump = (projectId) => notifyProject(projectId, { type: 'project', projectId });

async function logActivity(projectId, userId, type, detail) {
  await q('INSERT INTO activity (id,project_id,user_id,type,detail) VALUES ($1,$2,$3,$4,$5)', [uid(), projectId, userId, type, detail || '']);
  bump(projectId); // diffusion temps réel aux membres
}
async function notify(userId, type, title, detail) {
  await q('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)', [uid(), userId, type, title, detail || '']);
  notifyUser(userId, { type: 'notif' }); // met à jour la cloche en direct
}

async function projectManagers(projectId) {
  return many(`SELECT DISTINCT u.id, u.name, u.email, m.role
    FROM memberships m JOIN users u ON u.id=m.user_id
    WHERE m.project_id=$1 AND m.role IN ('owner','lead')`, [projectId]);
}

async function sendTaskAssignmentMails({ project, task, actor, assigneeId, source = 'project' }) {
  if (!assigneeId) return;
  const assignee = await userById(assigneeId);
  if (!assignee) return;
  const rows = [
    ['Projet', project.name],
    ['Tâche', task.title],
    ['Responsable', assignee.name],
    task.priority ? ['Priorité', 'P' + task.priority] : null,
    task.due ? ['Échéance', task.due] : null,
    source === 'meeting' ? ['Origine', 'Meeting'] : null,
  ];
  if (assignee.email && assignee.id !== actor.id) {
    await sendMail(assignee.email, `Tâche attribuée : ${task.title}`, {
      intro: `La tâche « ${task.title} » vous a été attribuée dans le projet « ${project.name} ».`,
      rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL,
    });
    await notify(assignee.id, 'task_assigned', `Tâche attribuée : ${task.title}`, `Projet « ${project.name} »`);
  }
  for (const manager of await projectManagers(project.id)) {
    if (!manager.email || manager.id === assignee.id) continue;
    await sendMail(manager.email, `Tâche attribuée dans « ${project.name} »`, {
      intro: `${actor.name} a attribué la tâche « ${task.title} » à ${assignee.name}.`,
      rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL,
    });
  }
}

/* ---------- app ---------- */
const app = express();
app.use(cors());
app.use(express.json());
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(e); if (!res.headersSent) res.status(500).json({ error: 'Erreur serveur' });
});

async function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const t = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!t) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(t, JWT_SECRET);
    const u = await userById(payload.sub);
    if (!u) return res.status(401).json({ error: 'Utilisateur introuvable' });
    req.user = u; next();
  } catch (e) { return res.status(401).json({ error: 'Session invalide' }); }
}

function adminOnly(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Accès réservé à l’administrateur' });
  next();
}
function superAdminOnly(req, res, next) {
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Réservé au super administrateur' });
  next();
}
async function audit(actor, action, detail) {
  try { await q('INSERT INTO admin_audit (id,actor_id,actor_name,action,detail) VALUES ($1,$2,$3,$4,$5)', [uid(), actor.id, actor.name, action, detail || '']); }
  catch (e) { console.error('audit', e.message); }
}

/* ---------- auth ---------- */
app.post('/api/auth/register', h(async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!name || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
  if (await userByEmail(email)) return res.status(409).json({ error: 'Cet email est déjà inscrit' });
  const job = (req.body.job || '').trim().slice(0, 60) || null;
  const u = { id: uid(), name, email, pass_hash: bcrypt.hashSync(password, 10), job };
  await q('INSERT INTO users (id,name,email,pass_hash,job) VALUES ($1,$2,$3,$4,$5)', [u.id, u.name, u.email, u.pass_hash, job]);
  res.json({ token: sign(u), user: publicUser(u) });
}));
app.post('/api/auth/login', h(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const u = await userByEmail(email);
  if (!u || !bcrypt.compareSync(req.body.password || '', u.pass_hash))
    return res.status(401).json({ error: 'Identifiants incorrects' });
  await q('UPDATE users SET last_login=now() WHERE id=$1', [u.id]);
  res.json({ token: sign(u), user: publicUser(u) });
}));
app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.patch('/api/me', auth, h(async (req, res) => {
  const first = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : (req.user.first_name || '');
  const last = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : (req.user.last_name || '');
  if (first.length > 60 || last.length > 60) return res.status(400).json({ error: 'Nom trop long' });
  const full = [first, last].filter(Boolean).join(' ').trim() || req.user.name;
  const job = typeof req.body.job === 'string' ? (req.body.job.trim().slice(0, 60) || null) : (req.user.job || null);
  let taskTypes = taskTypesOf(req.user);
  if (Array.isArray(req.body.taskTypes)) {
    const cleaned = cleanLabels(req.body.taskTypes, 30, 20);
    taskTypes = cleaned.length ? cleaned : DEFAULT_TASK_TYPES;
  }
  const roleLibrary = Array.isArray(req.body.roleLibrary) ? cleanLabels(req.body.roleLibrary, 40, 40) : roleLibraryOf(req.user);
  await q('UPDATE users SET first_name=$1, last_name=$2, name=$3, job=$4, task_types=$5, role_library=$6 WHERE id=$7',
    [first || null, last || null, full, job, JSON.stringify(taskTypes), JSON.stringify(roleLibrary), req.user.id]);
  const u = await userById(req.user.id);
  res.json({ user: publicUser(u) });
}));

app.get('/api/project-labels', auth, h(async (req, res) => {
  res.json({ labels: await ensureProjectLabels(req.user.id), colors: projectLabelColorsOf(req.user) });
}));

app.post('/api/project-labels', auth, h(async (req, res) => {
  const label = String(req.body.label || '').trim().slice(0, 28);
  if (!label) return res.status(400).json({ error: 'Libellé requis' });
  const labels = await ensureProjectLabels(req.user.id);
  if (labels.length >= 20) return res.status(400).json({ error: 'Maximum 20 libellés' });
  if (labels.some((l) => String(l.label).toLowerCase() === label.toLowerCase())) return res.status(409).json({ error: 'Ce libellé existe déjà' });
  const color = cleanColor(req.body.color, PROJECT_LABEL_COLORS[labels.length % PROJECT_LABEL_COLORS.length]);
  const colors = projectLabelColorsOf(req.user);
  if (!colors.some((c) => c.toLowerCase() === color.toLowerCase())) {
    await q('UPDATE users SET project_label_colors=$1 WHERE id=$2', [JSON.stringify(cleanLabels([...colors, color], 7, 40)), req.user.id]);
  }
  const maxPos = labels.reduce((m, l) => Math.max(m, Number(l.position) || 0), 0);
  const id = uid();
  await q('INSERT INTO project_labels (id,user_id,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,false)',
    [id, req.user.id, label, color, maxPos + 1]);
  res.json({ label: await one('SELECT id,label,color,position,fixed FROM project_labels WHERE id=$1', [id]) });
}));

app.patch('/api/project-label-colors', auth, h(async (req, res) => {
  const color = cleanColor(req.body.color, '');
  if (!color) return res.status(400).json({ error: 'Couleur invalide' });
  const colors = cleanLabels([...projectLabelColorsOf(req.user), color], 7, 40);
  await q('UPDATE users SET project_label_colors=$1 WHERE id=$2', [JSON.stringify(colors.filter((c) => !PROJECT_LABEL_COLORS.some((d) => d.toLowerCase() === c.toLowerCase()))), req.user.id]);
  const u = await userById(req.user.id);
  res.json({ colors: projectLabelColorsOf(u) });
}));

app.delete('/api/project-label-colors/:color', auth, h(async (req, res) => {
  const color = cleanColor('#' + String(req.params.color || '').replace(/^#/, ''), '');
  if (!color) return res.status(400).json({ error: 'Couleur invalide' });
  if (PROJECT_LABEL_COLORS.some((c) => c.toLowerCase() === color.toLowerCase())) return res.status(400).json({ error: 'Couleur par défaut' });
  const custom = projectLabelColorsOf(req.user).filter((c) => !PROJECT_LABEL_COLORS.some((d) => d.toLowerCase() === c.toLowerCase()) && c.toLowerCase() !== color.toLowerCase());
  await q('UPDATE users SET project_label_colors=$1 WHERE id=$2', [JSON.stringify(custom), req.user.id]);
  const u = await userById(req.user.id);
  res.json({ colors: projectLabelColorsOf(u) });
}));

app.delete('/api/project-labels/:id', auth, h(async (req, res) => {
  const label = await one('SELECT * FROM project_labels WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!label) return res.status(404).json({ error: 'Libellé introuvable' });
  if (label.fixed) return res.status(400).json({ error: 'Ce libellé par défaut ne peut pas être supprimé' });
  const fallback = await defaultProjectLabelId(req.user.id);
  await q('UPDATE projects SET label_id=$1 WHERE owner_id=$2 AND label_id=$3', [fallback, req.user.id, label.id]);
  await q('DELETE FROM project_labels WHERE id=$1 AND user_id=$2', [label.id, req.user.id]);
  res.json({ ok: true });
}));

/* ---------- projects ---------- */
const CREATOR_ROLE = { solo: 'owner', team: 'lead', group: 'owner' };
app.post('/api/projects', auth, h(async (req, res) => {
  const name = (req.body.name || '').trim();
  const type = req.body.type;
  if (!name) return res.status(400).json({ error: 'Nom du projet requis' });
  if (!['solo', 'team', 'group'].includes(type)) return res.status(400).json({ error: 'Type invalide' });
  const labels = await ensureProjectLabels(req.user.id);
  const requestedLabel = labels.find((l) => l.id === req.body.labelId);
  const labelId = requestedLabel ? requestedLabel.id : await defaultProjectLabelId(req.user.id);
  const id = uid(); const role = CREATOR_ROLE[type];
  await q('INSERT INTO projects (id,name,type,owner_id,deadline,label_id) VALUES ($1,$2,$3,$4,$5,$6)', [id, name, type, req.user.id, req.body.deadline || null, labelId]);
  await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4)', [uid(), id, req.user.id, role]);
  await ensureProjectStatuses(id);
  await logActivity(id, req.user.id, 'project_created', `a créé le projet « ${name} »`);
  const p = await projectById(id);
  res.json({ project: { ...p, my_role: role, memberCount: 1, taskCount: 0, doneCount: 0 } });
}));

app.get('/api/projects', auth, h(async (req, res) => {
  const defaults = await ensureProjectLabels(req.user.id);
  const fallback = defaults.find((l) => String(l.label).toLowerCase() === 'travail') || defaults[0];
  const rows = await many(`SELECT p.*, m.role AS my_role, m.position AS position,
      pl.id AS "labelId", pl.label AS "labelName", pl.color AS "labelColor",
      (SELECT count(*) FROM memberships mm WHERE mm.project_id=p.id)::int AS "memberCount",
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id)::int AS "taskCount",
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id AND t.done)::int AS "doneCount"
    FROM projects p JOIN memberships m ON m.project_id=p.id
    LEFT JOIN project_labels pl ON pl.id=p.label_id
    WHERE m.user_id=$1 ORDER BY m.position ASC NULLS LAST, p.name ASC`, [req.user.id]);
  for (const row of rows) {
    if (!row.labelId) {
      row.labelId = fallback.id;
      row.labelName = fallback.label;
      row.labelColor = fallback.color;
    }
  }
  res.json({ projects: rows });
}));

// Ordre manuel des projets — propre à chaque utilisateur (drag-and-drop)
app.put('/api/projects/order', auth, h(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < ids.length; i++) await client.query('UPDATE memberships SET position=$1 WHERE user_id=$2 AND project_id=$3', [i, req.user.id, ids[i]]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  res.json({ ok: true });
}));

async function projectDetail(p, userId) {
  const statuses = await ensureProjectStatuses(p.id);
  const defaults = await ensureProjectLabels(p.owner_id);
  const fallbackLabel = defaults.find((l) => String(l.label).toLowerCase() === 'travail') || defaults[0];
  const projectLabel = p.label_id ? await one('SELECT id,label,color FROM project_labels WHERE id=$1', [p.label_id]) : null;
  const roles = await many('SELECT id, name FROM project_roles WHERE project_id=$1 ORDER BY created_at ASC', [p.id]);
  const mroles = await many('SELECT user_id, role_id FROM member_roles WHERE project_id=$1', [p.id]);
  const rolesByMember = {};
  for (const r of mroles) (rolesByMember[r.user_id] = rolesByMember[r.user_id] || []).push(r.role_id);
  const members = (await many(`SELECT m.user_id AS id, m.role, u.name, u.email, u.job
      FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY m.joined_at`, [p.id]))
    .map(m => ({ id: m.id, role: m.role, name: m.name, email: m.email, job: m.job || '', roleIds: rolesByMember[m.id] || [] }));
  const transferRows = await many(`SELECT tr.*, fu.name AS from_name, tu.name AS to_name, cu.name AS created_by_name
      FROM task_transfers tr
      LEFT JOIN users fu ON fu.id=tr.from_user_id
      JOIN users tu ON tu.id=tr.to_user_id
      JOIN users cu ON cu.id=tr.created_by
      WHERE tr.project_id=$1 ORDER BY tr.created_at ASC`, [p.id]);
  const transfersByTask = {};
  for (const tr of transferRows) {
    (transfersByTask[tr.task_id] = transfersByTask[tr.task_id] || []).push({
      id: tr.id,
      fromUserId: tr.from_user_id || null,
      fromName: tr.from_name || null,
      toUserId: tr.to_user_id,
      toName: tr.to_name,
      createdBy: tr.created_by,
      createdByName: tr.created_by_name,
      at: tr.created_at,
    });
  }
  const tasks = (await many('SELECT * FROM tasks WHERE project_id=$1 ORDER BY priority ASC, created_at ASC', [p.id]))
    .map(t => ({ id: t.id, title: t.title, description: t.description || null, type: t.type || null, assigneeId: t.assignee_id, createdBy: t.created_by, due: t.due, done: t.done, doneAt: t.done_at, estHours: t.est_hours == null ? null : Number(t.est_hours), spentHours: t.spent_hours == null ? null : Number(t.spent_hours), priority: t.priority == null ? 6 : Number(t.priority), parentId: t.parent_id || null, position: t.position == null ? null : Number(t.position), statusKey: t.status_key || (t.done ? 'done' : 'todo'), transferable: t.transferable === true, transferredFrom: t.transferred_from || null, transferredTo: t.transferred_to || null, transferHistory: transfersByTask[t.id] || [] }));
  const pollRows = await many('SELECT * FROM polls WHERE project_id=$1 ORDER BY created_at DESC', [p.id]);
  const polls = [];
  for (const pl of pollRows) {
    const opts = await many('SELECT * FROM poll_options WHERE poll_id=$1', [pl.id]);
    const votes = await many('SELECT * FROM poll_votes WHERE poll_id=$1', [pl.id]);
    polls.push({
      id: pl.id, question: pl.question, closed: pl.closed, createdBy: pl.created_by,
      options: opts.map(o => ({ id: o.id, label: o.label, votes: votes.filter(v => v.option_id === o.id).length })),
      myVote: (votes.find(v => v.user_id === userId) || {}).option_id || null,
    });
  }
  const activity = (await many(`SELECT a.*, u.name AS user_name FROM activity a
      LEFT JOIN users u ON u.id=a.user_id WHERE a.project_id=$1 ORDER BY a.created_at DESC LIMIT 100`, [p.id]))
    .map(a => ({ id: a.id, type: a.type, detail: a.detail, user: a.user_name, at: a.created_at }));
  return {
    ...p,
    closedAt: p.done_at || null,
    reopenUntil: reopenUntil(p)?.toISOString() || null,
    canReopen: canReopenProject(p),
    labelId: (projectLabel && projectLabel.id) || fallbackLabel.id,
    labelName: (projectLabel && projectLabel.label) || fallbackLabel.label,
    labelColor: (projectLabel && projectLabel.color) || fallbackLabel.color,
    roles, statuses, members, tasks, polls, activity,
  };
}

app.get('/api/projects/:id', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Vous n’êtes pas membre de ce projet' });
  res.json({ project: { ...(await projectDetail(p, req.user.id)), my_role: m.role } });
}));

app.post('/api/projects/:id/close', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
  if (projectClosed(p)) return res.json({ ok: true });
  await q(`UPDATE projects SET status='done', done_at=now() WHERE id=$1`, [p.id]);
  await logActivity(p.id, req.user.id, 'project_closed', 'a clôturé le projet');
  res.json({ ok: true });
}));

app.post('/api/projects/:id/reopen', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  if (p.owner_id !== req.user.id) return res.status(403).json({ error: 'Seul le propriétaire peut réouvrir le projet' });
  if (!projectClosed(p)) return res.json({ ok: true });
  if (!canReopenProject(p)) return res.status(410).json({ error: 'Le délai de réouverture de 30 jours est dépassé' });
  await q(`UPDATE projects SET status='active', done_at=NULL WHERE id=$1`, [p.id]);
  await logActivity(p.id, req.user.id, 'project_reopened', 'a réouvert le projet');
  await notifyProject(p.id, { type: 'project', projectId: p.id });
  res.json({ ok: true });
}));

// Modifier un projet — réservé au propriétaire
app.patch('/api/projects/:id', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  if (p.owner_id !== req.user.id) return res.status(403).json({ error: 'Seul le propriétaire peut modifier le projet' });
  if (assertProjectOpen(p, res)) return;
  const sets = [], vals = [];
  if (typeof req.body.name === 'string') {
    const name = req.body.name.trim();
    if (!name) return res.status(400).json({ error: 'Le nom ne peut pas être vide' });
    sets.push(`name=$${sets.length + 1}`); vals.push(name);
  }
  if ('deadline' in req.body) { sets.push(`deadline=$${sets.length + 1}`); vals.push(req.body.deadline || null); }
  if ('labelId' in req.body) {
    const labels = await ensureProjectLabels(req.user.id);
    const nextLabel = labels.find((l) => l.id === req.body.labelId) || labels.find((l) => String(l.label).toLowerCase() === 'travail') || labels[0];
    sets.push(`label_id=$${sets.length + 1}`); vals.push(nextLabel.id);
  }
  if (!sets.length) return res.status(400).json({ error: 'Rien à modifier' });
  vals.push(p.id);
  await q(`UPDATE projects SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
  await logActivity(p.id, req.user.id, 'project_updated', 'a modifié le projet');
  // avertir les autres membres du changement
  for (const mb of await projectMembers(p.id)) {
    if (mb.user_id !== req.user.id) await notify(mb.user_id, 'project_updated', 'Projet modifié', `Le projet « ${req.body.name ? req.body.name.trim() : p.name} » a été mis à jour.`);
  }
  res.json({ project: await projectById(p.id) });
}));

// Supprimer un projet — réservé au propriétaire ; avertit puis retire tous les membres
app.delete('/api/projects/:id', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  if (p.owner_id !== req.user.id) return res.status(403).json({ error: 'Seul le propriétaire peut supprimer le projet' });
  const members = await projectMembers(p.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // avertir chaque membre (sauf le propriétaire) avant suppression
    for (const mb of members) {
      if (mb.user_id === req.user.id) continue;
      await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)',
        [uid(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${p.name} » a été supprimé par ${req.user.name}. Vous n'en êtes plus membre.`]);
    }
    // suppression en cascade
    await client.query('DELETE FROM poll_votes WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [p.id]);
    await client.query('DELETE FROM poll_options WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [p.id]);
    await client.query('DELETE FROM polls WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM task_transfers WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM project_meeting_task_delegates WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM meeting_messages WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM tasks WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM invites WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM activity WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM member_roles WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM project_roles WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM memberships WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM projects WHERE id=$1', [p.id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  res.json({ ok: true, notified: members.length - 1 });
}));

/* ---------- invitations ---------- */
app.post('/api/projects/:id/invites', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
  if (assertProjectOpen(p, res)) return;
  const role = req.body.role;
  const allowed = { solo: ['client'], team: ['client', 'provider'], group: ['member'] };
  if (!allowed[p.type].includes(role)) return res.status(400).json({ error: 'Rôle invalide pour ce type de projet' });
  const t = newToken();
  const expires = new Date(Date.now() + INVITE_DAYS * 864e5).toISOString();
  const multi = role !== 'client';
  await q('INSERT INTO invites (token,project_id,role,email,created_by,expires_at,multi) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [t, p.id, role, (req.body.email || '').trim().toLowerCase() || null, req.user.id, expires, multi]);
  await logActivity(p.id, req.user.id, 'invite_created', `a créé une invitation (${role})`);
  (async () => {
    const invitedEmail = (req.body.email || '').trim().toLowerCase();
    const rows = [['Projet', p.name], ['Rôle', role], invitedEmail ? ['Invité', invitedEmail] : null, ['Créé par', req.user.name]];
    const owner = await userById(p.owner_id);
    if (owner && owner.email) await sendMail(owner.email, `Invitation créée — ${p.name}`, { intro: `Un lien d'invitation (${role}) a été généré pour le projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL });
    for (const adminEmail of SUPER_ADMIN_EMAILS) {
      if (owner && owner.email && adminEmail === owner.email.toLowerCase()) continue;
      await sendMail(adminEmail, `Invitation créée — ${p.name}`, { intro: `${req.user.name} a généré un lien d'invitation (${role}) pour « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL });
    }
  })().catch((e) => console.error('mail invite_created', e.message));
  res.json({ token: t, link: `${APP_URL}/invite/${t}`, role, expiresAt: expires, multi });
}));

app.get('/api/invites/:token', h(async (req, res) => {
  const inv = await one('SELECT * FROM invites WHERE token=$1', [req.params.token]);
  if (!inv || inv.revoked) return res.status(404).json({ error: 'Invitation invalide' });
  if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Invitation expirée' });
  if (!inv.multi && inv.uses >= 1) return res.status(410).json({ error: 'Invitation déjà utilisée' });
  const p = await projectById(inv.project_id);
  const inviter = await userById(inv.created_by);
  res.json({ project: { id: p.id, name: p.name, type: p.type }, role: inv.role, invitedBy: inviter ? inviter.name : null });
}));

app.post('/api/invites/:token/accept', auth, h(async (req, res) => {
  const inv = await one('SELECT * FROM invites WHERE token=$1', [req.params.token]);
  if (!inv || inv.revoked) return res.status(404).json({ error: 'Invitation invalide' });
  if (new Date(inv.expires_at) < new Date()) return res.status(410).json({ error: 'Invitation expirée' });
  if (!inv.multi && inv.uses >= 1) return res.status(410).json({ error: 'Invitation déjà utilisée' });
  const p = await projectById(inv.project_id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  if (assertProjectOpen(p, res)) return;
  if (await membership(p.id, req.user.id)) return res.json({ project: { id: p.id }, already: true });
  await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4) ON CONFLICT (project_id,user_id) DO NOTHING', [uid(), p.id, req.user.id, inv.role]);
  await q('UPDATE invites SET uses=uses+1 WHERE token=$1', [inv.token]);
  await logActivity(p.id, req.user.id, 'member_joined', `${req.user.name} a rejoint (${inv.role})`);
  (async () => {
    const rows = [['Projet', p.name], ['Rôle', inv.role]];
    if (req.user.email) await sendMail(req.user.email, `Bienvenue dans « ${p.name} »`, { intro: `Vous avez rejoint le projet « ${p.name} » en tant que ${inv.role}.`, rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL });
    const owner = await userById(p.owner_id);
    if (owner && owner.id !== req.user.id) {
      if (owner.email) await sendMail(owner.email, `${req.user.name} a rejoint « ${p.name} »`, { intro: `${req.user.name} (${req.user.email}) a rejoint votre projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL });
      await notify(owner.id, 'member_joined', `${req.user.name} a rejoint « ${p.name} »`, `Rôle : ${inv.role}`);
    }
  })().catch((e) => console.error('mail member_joined', e.message));
  res.json({ project: { id: p.id }, role: inv.role });
}));

/* ---------- rôles de projet (fonctions assignées aux membres) ---------- */
// Créer un rôle dans le projet — propriétaire ou leader
app.post('/api/projects/:id/roles', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
  if (assertProjectOpen(p, res)) return;
  const name = (req.body.name || '').trim().slice(0, 40);
  if (!name) return res.status(400).json({ error: 'Nom du rôle requis' });
  const existing = await many('SELECT id FROM project_roles WHERE project_id=$1', [p.id]);
  if (existing.length >= 30) return res.status(400).json({ error: 'Trop de rôles (max 30)' });
  const dup = await one('SELECT id FROM project_roles WHERE project_id=$1 AND lower(name)=lower($2)', [p.id, name]);
  if (dup) return res.status(409).json({ error: 'Ce rôle existe déjà' });
  const id = uid();
  await q('INSERT INTO project_roles (id,project_id,name) VALUES ($1,$2,$3)', [id, p.id, name]);
  await logActivity(p.id, req.user.id, 'role_created', `a créé le rôle « ${name} »`);
  res.json({ role: { id, name } });
}));

// Supprimer un rôle — propriétaire ou leader
app.delete('/api/projects/:id/roles/:roleId', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
  if (assertProjectOpen(p, res)) return;
  const role = await one('SELECT * FROM project_roles WHERE id=$1 AND project_id=$2', [req.params.roleId, p.id]);
  if (!role) return res.status(404).json({ error: 'Rôle introuvable' });
  await q('DELETE FROM member_roles WHERE project_id=$1 AND role_id=$2', [p.id, role.id]);
  await q('DELETE FROM project_roles WHERE id=$1', [role.id]);
  bump(p.id);
  res.json({ ok: true });
}));

// Assigner la liste des rôles d'un membre — propriétaire ou leader
app.put('/api/projects/:id/members/:userId/roles', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
  if (assertProjectOpen(p, res)) return;
  const target = await membership(p.id, req.params.userId);
  if (!target) return res.status(400).json({ error: 'Ce membre ne fait pas partie du projet' });
  const wanted = Array.isArray(req.body.roleIds) ? req.body.roleIds : [];
  const valid = await many('SELECT id FROM project_roles WHERE project_id=$1', [p.id]);
  const validIds = new Set(valid.map((r) => r.id));
  const ids = [...new Set(wanted.filter((r) => validIds.has(r)))];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM member_roles WHERE project_id=$1 AND user_id=$2', [p.id, target.user_id]);
    for (const rid of ids) await client.query('INSERT INTO member_roles (project_id,user_id,role_id) VALUES ($1,$2,$3)', [p.id, target.user_id, rid]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  await logActivity(p.id, req.user.id, 'roles_assigned', 'a mis à jour les rôles d’un membre');
  res.json({ ok: true, roleIds: ids });
}));

/* ---------- statuts de tâches ---------- */
app.post('/api/projects/:id/task-statuses', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
  if (assertProjectOpen(p, res)) return;
  const label = (req.body.label || '').trim().slice(0, 32);
  if (!label) return res.status(400).json({ error: 'Nom du statut requis' });
  const count = await one('SELECT count(*)::int AS c FROM task_statuses WHERE project_id=$1', [p.id]);
  if (Number(count.c) >= 12) return res.status(400).json({ error: 'Trop de statuts (max 12)' });
  let key = slugStatus(label);
  const dup = await one('SELECT 1 FROM task_statuses WHERE project_id=$1 AND (key=$2 OR lower(label)=lower($3))', [p.id, key, label]);
  if (dup) return res.status(409).json({ error: 'Ce statut existe déjà' });
  const maxPos = await one('SELECT coalesce(max(position),0)::int AS p FROM task_statuses WHERE project_id=$1 AND key <> $2', [p.id, 'done']);
  const color = (req.body.color || '#9a988f').trim().slice(0, 24);
  await q('INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6,false)', [uid(), p.id, key, label, color, Number(maxPos.p) + 1]);
  await logActivity(p.id, req.user.id, 'task_status_created', `a créé le statut « ${label} »`);
  res.json({ statuses: await ensureProjectStatuses(p.id) });
}));

app.delete('/api/projects/:id/task-statuses/:key', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
  if (assertProjectOpen(p, res)) return;
  const st = await one('SELECT * FROM task_statuses WHERE project_id=$1 AND key=$2', [p.id, req.params.key]);
  if (!st) return res.status(404).json({ error: 'Statut introuvable' });
  if (st.fixed) return res.status(400).json({ error: 'Ce statut fixe ne peut pas être supprimé' });
  await q('UPDATE tasks SET status_key=$1, done=false, done_at=NULL, transferred_from=NULL, transferred_to=NULL WHERE project_id=$2 AND status_key=$3', ['todo', p.id, st.key]);
  await q('DELETE FROM task_statuses WHERE project_id=$1 AND key=$2', [p.id, st.key]);
  await logActivity(p.id, req.user.id, 'task_status_deleted', `a supprimé le statut « ${st.label} »`);
  res.json({ statuses: await ensureProjectStatuses(p.id) });
}));

/* ---------- tasks ---------- */
// Ordre manuel des tâches d'un projet (drag-and-drop, partagé aux membres)
app.put('/api/projects/:id/tasks/order', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  if (assertProjectOpen(p, res)) return;
  const m = await membership(req.params.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < ids.length; i++) await client.query('UPDATE tasks SET position=$1 WHERE id=$2 AND project_id=$3', [i, ids[i], req.params.id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  bump(req.params.id);
  res.json({ ok: true });
}));

app.post('/api/projects/:id/tasks', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  if (assertProjectOpen(p, res)) return;
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Intitulé requis' });
  const assignee = req.body.assigneeId || null;
  if (assignee && !(await membership(p.id, assignee))) return res.status(400).json({ error: 'Le responsable doit être membre' });
  const id = uid();
  const est = numOrNull(req.body.estHours);
  const prio = prioOrDefault(req.body.priority);
  const description = (req.body.description || '').trim() || null;
  const type = (req.body.type || '').trim().slice(0, 30) || null;
  const transferable = req.body.transferable === true;
  const statuses = await ensureProjectStatuses(p.id);
  const statusKey = statuses.some((s) => s.key === req.body.statusKey) ? req.body.statusKey : 'todo';
  if (statusKey === 'transferred' && !transferable) return res.status(400).json({ error: 'Cette tâche doit être marquée transférable' });
  let parentId = req.body.parentId || null;
  if (parentId) {
    const parent = await taskById(parentId);
    if (!parent || parent.project_id !== p.id) return res.status(400).json({ error: 'Tâche parente invalide' });
    if (parent.parent_id) parentId = parent.parent_id; // pas de sous-sous-tâche : rattache au parent racine
  }
  await q('INSERT INTO tasks (id,project_id,title,description,type,assignee_id,created_by,due,est_hours,priority,parent_id,status_key,done,done_at,transferable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [id, p.id, title, description, type, assignee, req.user.id, req.body.due || null, est, prio, parentId, statusKey, statusKey === 'done', statusKey === 'done' ? new Date().toISOString() : null, transferable]);
  await logActivity(p.id, req.user.id, 'task_created', `a ajouté « ${title} »`);
  (async () => {
    if (assignee) await sendTaskAssignmentMails({
      project: p,
      task: { id, title, priority: prio, due: req.body.due || null },
      actor: req.user,
      assigneeId: assignee,
    });
    else {
      const rows = [['Projet', p.name], ['Priorité', 'P' + prio], type ? ['Type', type] : null, req.body.due ? ['Échéance', req.body.due] : null];
      for (const manager of await projectManagers(p.id)) {
        if (manager.email && manager.id !== req.user.id) await sendMail(manager.email, `Nouvelle tâche dans « ${p.name} » : ${title}`, { intro: `${req.user.name} a ajouté une tâche non assignée au projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL });
      }
    }
  })().catch((e) => console.error('mail task_created', e.message));
  res.json({ task: { id, title, description, type, assigneeId: assignee, createdBy: req.user.id, due: req.body.due || null, done: statusKey === 'done', estHours: est, spentHours: null, priority: prio, parentId, statusKey, transferable } });
}));

app.patch('/api/tasks/:id', auth, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const m = await membership(t.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const p = await projectById(t.project_id);
  if (assertProjectOpen(p, res)) return;
  const b = req.body || {};
  const isCreator = t.created_by === req.user.id;
  const isAssignee = t.assignee_id === req.user.id;
  const manage = canManage(m.role);

  // Cocher / décocher : réservé au responsable
  if (typeof b.done === 'boolean') {
    if (!isAssignee) return res.status(403).json({ error: 'Seul le responsable de la tâche peut la cocher' });
    await q('UPDATE tasks SET done=$1, done_at=$2, status_key=$3 WHERE id=$4', [b.done, b.done ? new Date().toISOString() : null, b.done ? 'done' : 'todo', t.id]);
    if (b.done) await logActivity(t.project_id, req.user.id, 'task_done', `a terminé « ${t.title} »`);
  }

  if ('statusKey' in b || 'transferredTo' in b) {
    if (!(isAssignee || isCreator || manage)) return res.status(403).json({ error: 'Statut réservé au responsable, au créateur ou au propriétaire' });
    const statuses = await ensureProjectStatuses(t.project_id);
    const nextStatus = statuses.some((s) => s.key === b.statusKey) ? b.statusKey : t.status_key || 'todo';
    let transferredTo = 'transferredTo' in b ? (b.transferredTo || null) : t.transferred_to;
    if (transferredTo && !(await membership(t.project_id, transferredTo))) return res.status(400).json({ error: 'Le destinataire doit être membre' });
    const isTransfer = nextStatus === 'transferred';
    if (isTransfer && !t.transferable) return res.status(400).json({ error: 'Cette tâche n’est pas transférable' });
    if (isTransfer && !transferredTo) return res.status(400).json({ error: 'Choisissez la personne à qui transférer' });
    if (isTransfer && transferredTo === t.assignee_id) return res.status(400).json({ error: 'Choisissez une autre personne' });
    const done = nextStatus === 'done';
    await q(`UPDATE tasks SET status_key=$1, done=$2, done_at=$3, transferred_from=$4, transferred_to=$5, assignee_id=$6 WHERE id=$7`,
      [nextStatus, done, done ? (t.done_at || new Date().toISOString()) : null, isTransfer ? (t.assignee_id || req.user.id) : null, isTransfer ? transferredTo : null, isTransfer ? transferredTo : t.assignee_id, t.id]);
    await logActivity(t.project_id, req.user.id, 'task_status', `a déplacé « ${t.title} » vers ${nextStatus}`);
    if (isTransfer) {
      await q('INSERT INTO task_transfers (id,task_id,project_id,from_user_id,to_user_id,created_by) VALUES ($1,$2,$3,$4,$5,$6)',
        [uid(), t.id, t.project_id, t.assignee_id || req.user.id, transferredTo, req.user.id]);
      if (transferredTo !== req.user.id) await notify(transferredTo, 'task_transferred', `Tâche transférée : ${t.title}`, `${req.user.name} vous a transféré une tâche.`);
      const p = await projectById(t.project_id);
      await sendTaskAssignmentMails({
        project: p,
        task: { id: t.id, title: t.title, priority: t.priority, due: t.due },
        actor: req.user,
        assigneeId: transferredTo,
      });
    }
  }

  // Heures (estimées / passées) : responsable ou propriétaire/leader
  if ('estHours' in b || 'spentHours' in b) {
    if (!(isAssignee || manage)) return res.status(403).json({ error: 'Heures réservées au responsable ou au propriétaire' });
    const sets = [], vals = [];
    if ('estHours' in b) { sets.push(`est_hours=$${sets.length + 1}`); vals.push(numOrNull(b.estHours)); }
    if ('spentHours' in b) { sets.push(`spent_hours=$${sets.length + 1}`); vals.push(numOrNull(b.spentHours)); }
    if (sets.length) { vals.push(t.id); await q(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals); }
  }

  // Priorité (1–6) : responsable, créateur ou propriétaire/leader
  if ('priority' in b) {
    if (!(isAssignee || isCreator || manage)) return res.status(403).json({ error: 'Priorité réservée au responsable, au créateur ou au propriétaire' });
    const n = parseInt(b.priority, 10);
    if (!(n >= 1 && n <= 6)) return res.status(400).json({ error: 'Priorité invalide (1 à 6)' });
    await q('UPDATE tasks SET priority=$1 WHERE id=$2', [n, t.id]);
  }

  // Édition (titre / description / type / échéance / responsable) : créateur ou propriétaire/leader
  if ('title' in b || 'description' in b || 'type' in b || 'due' in b || 'assigneeId' in b || 'transferable' in b) {
    if (!(isCreator || manage)) return res.status(403).json({ error: 'Modification réservée au créateur ou au propriétaire' });
    const sets = [], vals = [];
    let nextTitle = t.title;
    let nextDue = t.due || null;
    let nextAssignee = t.assignee_id || null;
    if ('title' in b) {
      const title = (b.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Intitulé requis' });
      sets.push(`title=$${sets.length + 1}`); vals.push(title);
      nextTitle = title;
    }
    if ('description' in b) { sets.push(`description=$${sets.length + 1}`); vals.push((b.description || '').trim() || null); }
    if ('type' in b) { sets.push(`type=$${sets.length + 1}`); vals.push((b.type || '').trim().slice(0, 30) || null); }
    if ('due' in b) { sets.push(`due=$${sets.length + 1}`); vals.push(b.due || null); nextDue = b.due || null; }
    if ('assigneeId' in b) {
      const a = b.assigneeId || null;
      if (a && !(await membership(t.project_id, a))) return res.status(400).json({ error: 'Le responsable doit être membre' });
      sets.push(`assignee_id=$${sets.length + 1}`); vals.push(a);
      nextAssignee = a;
    }
    if ('transferable' in b) { sets.push(`transferable=$${sets.length + 1}`); vals.push(b.transferable === true); }
    if (sets.length) { vals.push(t.id); await q(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals); }
    await logActivity(t.project_id, req.user.id, 'task_updated', `a modifié « ${t.title} »`);
    if ('assigneeId' in b && nextAssignee && nextAssignee !== t.assignee_id) {
      const p = await projectById(t.project_id);
      await sendTaskAssignmentMails({
        project: p,
        task: { id: t.id, title: nextTitle, priority: t.priority || b.priority, due: nextDue },
        actor: req.user,
        assigneeId: nextAssignee,
      });
    }
  }

  bump(t.project_id);
  res.json({ ok: true });
}));

app.post('/api/tasks/:id/claim', auth, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const m = await membership(t.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const p = await projectById(t.project_id);
  if (assertProjectOpen(p, res)) return;
  if (t.assignee_id) return res.status(409).json({ error: 'Tâche déjà prise' });
  await q('UPDATE tasks SET assignee_id=$1 WHERE id=$2', [req.user.id, t.id]);
  await logActivity(t.project_id, req.user.id, 'task_claimed', `a pris « ${t.title} »`);
  res.json({ ok: true });
}));

app.post('/api/tasks/:id/remind', auth, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const m = await membership(t.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const p = await projectById(t.project_id);
  if (assertProjectOpen(p, res)) return;
  if (!t.assignee_id) return res.status(400).json({ error: 'Cette tâche n’a pas de responsable' });
  const manage = canManage(m.role);
  if (!(manage || t.created_by === req.user.id)) return res.status(403).json({ error: 'Relance réservée au créateur ou au responsable du projet' });
  const assignee = await userById(t.assignee_id);
  if (!assignee || !assignee.email) return res.status(400).json({ error: 'Pas d’email pour ce responsable' });
  const rows = [['Projet', p.name], ['Tâche', t.title], ['Responsable', assignee.name], t.due ? ['Échéance', t.due] : null, ['Priorité', 'P' + (t.priority || 6)]];
  await sendMail(assignee.email, `Relance : « ${t.title} »`, {
    intro: `${req.user.name} vous relance pour la tâche « ${t.title} » dans le projet « ${p.name} ».`,
    rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL,
  });
  await notify(assignee.id, 'task_reminder', `Relance : ${t.title}`, `${req.user.name} vous a relancé.`);
  await logActivity(t.project_id, req.user.id, 'task_reminded', `a relancé « ${t.title} »`);
  res.json({ ok: true });
}));

app.delete('/api/tasks/:id', auth, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const m = await membership(t.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const p = await projectById(t.project_id);
  if (assertProjectOpen(p, res)) return;
  if (t.created_by !== req.user.id && !canManage(m.role)) return res.status(403).json({ error: 'Suppression réservée au créateur ou au propriétaire' });
  await q('DELETE FROM tasks WHERE id=$1 OR parent_id=$1', [t.id]);
  bump(t.project_id);
  res.json({ ok: true });
}));

/* ---------- meeting : chat + tâches ---------- */
app.get('/api/projects/:id/meeting/messages', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  if (assertProjectOpen(p, res)) return;
  const rows = await many(`SELECT mm.*, u.name AS user_name
      FROM meeting_messages mm JOIN users u ON u.id=mm.user_id
      WHERE mm.project_id=$1 ORDER BY mm.created_at ASC LIMIT 200`, [p.id]);
  res.json({
    messages: rows.map((r) => ({
      id: r.id, projectId: r.project_id, userId: r.user_id, userName: r.user_name,
      body: r.body, createdTaskId: r.created_task_id || null, at: r.created_at,
    })),
  });
}));

app.post('/api/projects/:id/meeting/messages', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  if (assertProjectOpen(p, res)) return;
  const body = String(req.body.body || '').trim().slice(0, 1200);
  if (!body) return res.status(400).json({ error: 'Message vide' });
  const id = uid();
  await q('INSERT INTO meeting_messages (id,project_id,user_id,body) VALUES ($1,$2,$3,$4)', [id, p.id, req.user.id, body]);
  await notifyProject(p.id, { type: 'meeting_chat', projectId: p.id });
  res.json({ message: { id, projectId: p.id, userId: req.user.id, userName: req.user.name, body, createdTaskId: null, at: new Date().toISOString() } });
}));

app.get('/api/projects/:id/meeting/task-delegates', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  if (assertProjectOpen(p, res)) return;
  const rows = await many('SELECT user_id FROM project_meeting_task_delegates WHERE project_id=$1', [p.id]);
  res.json({ userIds: rows.map((r) => r.user_id) });
}));

app.put('/api/projects/:id/meeting/task-delegates', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au chef du projet' });
  if (assertProjectOpen(p, res)) return;
  const wanted = Array.isArray(req.body.userIds) ? [...new Set(req.body.userIds.filter(Boolean))] : [];
  const members = await projectMembers(p.id);
  const memberIds = new Set(members.map((x) => x.user_id));
  const ids = wanted.filter((id) => memberIds.has(id));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM project_meeting_task_delegates WHERE project_id=$1', [p.id]);
    for (const id of ids) await client.query('INSERT INTO project_meeting_task_delegates (project_id,user_id,created_by) VALUES ($1,$2,$3)', [p.id, id, req.user.id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  await notifyProject(p.id, { type: 'meeting_chat', projectId: p.id });
  res.json({ userIds: ids });
}));

app.post('/api/projects/:id/meeting/tasks', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (assertProjectOpen(p, res)) return;
  const delegated = await one('SELECT 1 FROM project_meeting_task_delegates WHERE project_id=$1 AND user_id=$2', [p.id, req.user.id]);
  if (!m || !(canManage(m.role) || delegated)) return res.status(403).json({ error: 'Vous n’êtes pas autorisé à créer des tâches depuis ce meeting' });
  const title = String(req.body.title || '').trim().slice(0, 160);
  if (!title) return res.status(400).json({ error: 'Titre requis' });
  const assignee = req.body.assigneeId || null;
  if (assignee && !(await membership(p.id, assignee))) return res.status(400).json({ error: 'Le responsable doit être membre' });
  const statuses = await ensureProjectStatuses(p.id);
  const statusKey = statuses.some((s) => s.key === req.body.statusKey) ? req.body.statusKey : 'todo';
  const prio = prioOrDefault(req.body.priority);
  const description = String(req.body.description || '').trim().slice(0, 1000) || null;
  const transferable = req.body.transferable === true;
  const id = uid();
  if (statusKey === 'transferred' && !transferable) return res.status(400).json({ error: 'Cette tâche doit être marquée transférable' });
  await q('INSERT INTO tasks (id,project_id,title,description,type,assignee_id,created_by,due,priority,status_key,done,done_at,transferable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
    [id, p.id, title, description, 'Tâche', assignee, req.user.id, req.body.due || null, prio, statusKey, statusKey === 'done', statusKey === 'done' ? new Date().toISOString() : null, transferable]);
  const sourceMessageId = req.body.messageId || null;
  if (sourceMessageId) await q('UPDATE meeting_messages SET created_task_id=$1 WHERE id=$2 AND project_id=$3', [id, sourceMessageId, p.id]);
  await logActivity(p.id, req.user.id, 'meeting_task_created', `a créé depuis le meeting « ${title} »`);
  if (assignee) {
    await sendTaskAssignmentMails({
      project: p,
      task: { id, title, priority: prio, due: req.body.due || null },
      actor: req.user,
      assigneeId: assignee,
      source: 'meeting',
    });
  }
  await notifyProject(p.id, { type: 'meeting_chat', projectId: p.id });
  await notifyProject(p.id, { type: 'project', projectId: p.id });
  res.json({ task: { id, title, description, type: 'Tâche', assigneeId: assignee, createdBy: req.user.id, due: req.body.due || null, done: statusKey === 'done', priority: prio, statusKey, transferable } });
}));

/* ---------- polls ---------- */
app.post('/api/projects/:id/polls', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  if (assertProjectOpen(p, res)) return;
  const question = (req.body.question || '').trim();
  const options = (req.body.options || []).map(o => (o || '').trim()).filter(Boolean);
  if (!question || options.length < 2) return res.status(400).json({ error: 'Question et au moins 2 options requises' });
  const pollId = uid();
  await q('INSERT INTO polls (id,project_id,question,created_by) VALUES ($1,$2,$3,$4)', [pollId, p.id, question, req.user.id]);
  for (const label of options) await q('INSERT INTO poll_options (id,poll_id,label) VALUES ($1,$2,$3)', [uid(), pollId, label]);
  await logActivity(p.id, req.user.id, 'poll_created', `a lancé un sondage : « ${question} »`);
  res.json({ pollId });
}));

app.post('/api/polls/:id/vote', auth, h(async (req, res) => {
  const poll = await one('SELECT * FROM polls WHERE id=$1', [req.params.id]);
  if (!poll) return res.status(404).json({ error: 'Sondage introuvable' });
  const m = await membership(poll.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const p = await projectById(poll.project_id);
  if (assertProjectOpen(p, res)) return;
  const opt = await one('SELECT * FROM poll_options WHERE poll_id=$1 AND id=$2', [poll.id, req.body.optionId]);
  if (!opt) return res.status(400).json({ error: 'Option invalide' });
  await q(`INSERT INTO poll_votes (poll_id,option_id,user_id) VALUES ($1,$2,$3)
    ON CONFLICT (poll_id,user_id) DO UPDATE SET option_id=excluded.option_id`, [poll.id, opt.id, req.user.id]);
  bump(poll.project_id);
  res.json({ ok: true });
}));

/* ---------- activity ---------- */
app.get('/api/projects/:id/activity', auth, h(async (req, res) => {
  const m = await membership(req.params.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const list = (await many(`SELECT a.*, u.name AS user_name FROM activity a
      LEFT JOIN users u ON u.id=a.user_id WHERE a.project_id=$1 ORDER BY a.created_at DESC LIMIT 100`, [req.params.id]))
    .map(a => ({ id: a.id, type: a.type, detail: a.detail, user: a.user_name, at: a.created_at }));
  res.json({ activity: list });
}));

/* ---------- notifications ---------- */
app.get('/api/notifications', auth, h(async (req, res) => {
  const rows = await many('SELECT id,type,title,detail,read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  const items = rows.map(n => ({ id: n.id, type: n.type, title: n.title, detail: n.detail, read: n.read, at: n.created_at }));
  res.json({ notifications: items, unread: items.filter(n => !n.read).length });
}));

app.post('/api/notifications/read', auth, h(async (req, res) => {
  if (Array.isArray(req.body.ids) && req.body.ids.length)
    await q('UPDATE notifications SET read=true WHERE user_id=$1 AND id = ANY($2)', [req.user.id, req.body.ids]);
  else
    await q('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.id]);
  res.json({ ok: true });
}));

app.delete('/api/notifications/:id', auth, h(async (req, res) => {
  await q('DELETE FROM notifications WHERE user_id=$1 AND id=$2', [req.user.id, req.params.id]);
  res.json({ ok: true });
}));

/* ---------- admin ---------- */
const pointsForTask = (due, doneDay) => { if (!due) return 10; if (!doneDay) return 15; if (doneDay < due) return 20; if (doneDay === due) return 15; return 5; };

// Vue d'ensemble : compteurs globaux
app.get('/api/admin/stats', auth, adminOnly, h(async (req, res) => {
  const n = async (sql) => Number((await one(sql, [])).c);
  const users = await n('SELECT count(*)::int AS c FROM users');
  const projects = await n('SELECT count(*)::int AS c FROM projects');
  const projectsActive = await n(`SELECT count(*)::int AS c FROM projects WHERE status <> 'done'`);
  const tasks = await n('SELECT count(*)::int AS c FROM tasks');
  const tasksDone = await n('SELECT count(*)::int AS c FROM tasks WHERE done');
  const tasksOverdue = await n(`SELECT count(*)::int AS c FROM tasks WHERE NOT done AND due IS NOT NULL AND due < to_char(now(),'YYYY-MM-DD')`);
  const active7 = await n(`SELECT count(*)::int AS c FROM users WHERE last_login > now() - interval '7 days'`);
  // Données graphiques
  const prioRows = await many('SELECT priority, count(*)::int AS c FROM tasks GROUP BY priority', []);
  const tasksByPriority = [1, 2, 3, 4, 5, 6].map((p) => ({ p, c: (prioRows.find((r) => Number(r.priority) === p) || {}).c || 0 }));
  const typeRows = await many('SELECT type, count(*)::int AS c FROM projects GROUP BY type', []);
  const projectsByType = ['solo', 'team', 'group'].map((t) => ({ t, c: (typeRows.find((r) => r.type === t) || {}).c || 0 }));
  const doneRows = await many(`SELECT to_char(done_at,'YYYY-MM-DD') AS d, count(*)::int AS c FROM tasks WHERE done AND done_at > now() - interval '14 days' GROUP BY d`, []);
  const doneByDay = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); doneByDay.push({ d, c: (doneRows.find((r) => r.d === d) || {}).c || 0 }); }
  const recentLogins = (await many('SELECT name, email, last_login FROM users WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 8', []))
    .map((u) => ({ name: u.name, email: u.email, lastLogin: u.last_login }));
  res.json({
    stats: {
      users, projects, projectsActive, tasks, tasksDone, tasksOpen: tasks - tasksDone, tasksOverdue,
      completion: tasks ? Math.round((tasksDone / tasks) * 100) : 0, activeUsers7: active7,
      tasksByPriority, projectsByType, doneByDay, recentLogins,
    },
  });
}));

// Liste de tous les utilisateurs (avec points, nb projets, nb tâches)
app.get('/api/admin/users', auth, adminOnly, h(async (req, res) => {
  const users = await many('SELECT id,name,email,first_name,last_name,is_admin,created_at,last_login FROM users ORDER BY created_at ASC', []);
  const pc = await many('SELECT user_id, count(*)::int AS c FROM memberships GROUP BY user_id', []);
  const doneRows = await many('SELECT assignee_id, due, done_at FROM tasks WHERE done AND assignee_id IS NOT NULL', []);
  const openRows = await many('SELECT assignee_id, count(*)::int AS c FROM tasks WHERE NOT done AND assignee_id IS NOT NULL GROUP BY assignee_id', []);
  const projByUser = Object.fromEntries(pc.map((r) => [r.user_id, r.c]));
  const openByUser = Object.fromEntries(openRows.map((r) => [r.assignee_id, r.c]));
  const ptsByUser = {}; const doneByUser = {};
  for (const t of doneRows) {
    const day = t.done_at ? new Date(t.done_at).toISOString().slice(0, 10) : null;
    ptsByUser[t.assignee_id] = (ptsByUser[t.assignee_id] || 0) + pointsForTask(t.due, day);
    doneByUser[t.assignee_id] = (doneByUser[t.assignee_id] || 0) + 1;
  }
  res.json({
    users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email, firstName: u.first_name || '', lastName: u.last_name || '',
      createdAt: u.created_at, lastLogin: u.last_login, admin: isAdmin(u), superAdmin: isSuperAdmin(u),
      projectCount: projByUser[u.id] || 0, tasksOpen: openByUser[u.id] || 0, tasksDone: doneByUser[u.id] || 0, points: ptsByUser[u.id] || 0,
    })),
  });
}));

// Supprimer un utilisateur : projets possédés supprimés (membres notifiés), retiré des projets, tâches désassignées
app.delete('/api/admin/users/:id', auth, adminOnly, h(async (req, res) => {
  const target = await userById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  if (isSuperAdmin(target)) return res.status(400).json({ error: 'Impossible de supprimer le super administrateur' });
  if (isAdmin(target) && !isSuperAdmin(req.user)) return res.status(403).json({ error: 'Seul le super administrateur peut supprimer un admin' });
  const owned = await many('SELECT id, name FROM projects WHERE owner_id=$1', [target.id]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Supprimer les projets possédés (avec notification aux autres membres)
    for (const pr of owned) {
      const members = await client.query('SELECT user_id FROM memberships WHERE project_id=$1', [pr.id]);
      for (const mb of members.rows) {
        if (mb.user_id === target.id) continue;
        await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)',
          [uid(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${pr.name} » a été supprimé par l’administrateur.`]);
      }
      await client.query('DELETE FROM poll_votes WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [pr.id]);
      await client.query('DELETE FROM poll_options WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [pr.id]);
      await client.query('DELETE FROM polls WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM task_transfers WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM project_meeting_task_delegates WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM meeting_messages WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM tasks WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM invites WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM activity WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM member_roles WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM project_roles WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM memberships WHERE project_id=$1', [pr.id]);
      await client.query('DELETE FROM projects WHERE id=$1', [pr.id]);
    }
    // Désassigner ses tâches restantes + retirer de tous les projets + nettoyer
    await client.query('UPDATE tasks SET assignee_id=NULL WHERE assignee_id=$1', [target.id]);
    await client.query('DELETE FROM poll_votes WHERE user_id=$1', [target.id]);
    await client.query('DELETE FROM member_roles WHERE user_id=$1', [target.id]);
    await client.query('DELETE FROM memberships WHERE user_id=$1', [target.id]);
    await client.query('DELETE FROM notifications WHERE user_id=$1', [target.id]);
    await client.query('DELETE FROM users WHERE id=$1', [target.id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  await audit(req.user, 'delete_user', `${target.name} (${target.email})${owned.length ? ` + ${owned.length} projet(s)` : ''}`);
  res.json({ ok: true, deletedProjects: owned.length });
}));

// Promouvoir / rétrograder un admin — réservé au super administrateur
app.patch('/api/admin/users/:id/admin', auth, superAdminOnly, h(async (req, res) => {
  const target = await userById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (isSuperAdmin(target)) return res.status(400).json({ error: 'Le super administrateur est admin par défaut' });
  const val = !!req.body.admin;
  await q('UPDATE users SET is_admin=$1 WHERE id=$2', [val, target.id]);
  await audit(req.user, val ? 'grant_admin' : 'revoke_admin', `${target.name} (${target.email})`);
  res.json({ ok: true, admin: val });
}));

// Journal d'audit — réservé au super administrateur
app.get('/api/admin/audit', auth, superAdminOnly, h(async (req, res) => {
  const rows = await many('SELECT id,actor_name,action,detail,created_at FROM admin_audit ORDER BY created_at DESC LIMIT 100', []);
  res.json({ audit: rows.map((r) => ({ id: r.id, actor: r.actor_name, action: r.action, detail: r.detail, at: r.created_at })) });
}));

/* ---------- boîte mail (super administrateur) ---------- */
app.get('/api/admin/mail', auth, superAdminOnly, h(async (req, res) => {
  if (!MAIL_ON) return res.status(503).json({ error: 'Boîte mail non configurée (SMTP_PASS absent sur le serveur).' });
  try { res.json({ messages: await imapList(30), mailbox: SMTP_USER }); }
  catch (e) { console.error('imap list', e.message); res.status(502).json({ error: 'Connexion à la boîte mail échouée : ' + e.message }); }
}));
app.get('/api/admin/mail/:uid', auth, superAdminOnly, h(async (req, res) => {
  if (!MAIL_ON) return res.status(503).json({ error: 'Boîte mail non configurée.' });
  try { const m = await imapRead(req.params.uid); if (!m) return res.status(404).json({ error: 'Message introuvable' }); res.json({ message: m }); }
  catch (e) { console.error('imap read', e.message); res.status(502).json({ error: 'Lecture du message échouée : ' + e.message }); }
}));
app.post('/api/admin/mail/send', auth, superAdminOnly, h(async (req, res) => {
  const to = (req.body.to || '').trim(); const subject = (req.body.subject || '').trim(); const text = String(req.body.body || '');
  if (!to || !subject) return res.status(400).json({ error: 'Destinataire et objet requis' });
  try { await sendRaw({ to, subject, text }); await audit(req.user, 'mail_sent', `→ ${to} : ${subject}`); res.json({ ok: true }); }
  catch (e) { res.status(502).json({ error: 'Envoi échoué : ' + e.message }); }
}));
app.post('/api/admin/mail/:uid/reply', auth, superAdminOnly, h(async (req, res) => {
  const text = String(req.body.body || '');
  try {
    const orig = await imapRead(req.params.uid);
    if (!orig) return res.status(404).json({ error: 'Message introuvable' });
    const to = orig.replyTo || orig.from;
    const subject = /^re\s*:/i.test(orig.subject) ? orig.subject : ('Re: ' + orig.subject);
    await sendRaw({ to, subject, text, inReplyTo: orig.messageId });
    await audit(req.user, 'mail_reply', `→ ${to} : ${subject}`);
    res.json({ ok: true });
  } catch (e) { res.status(502).json({ error: 'Réponse échouée : ' + e.message }); }
}));

// Toutes les tâches (avec projet + responsable) pour l'admin
app.get('/api/admin/tasks', auth, adminOnly, h(async (req, res) => {
  const rows = await many(`SELECT t.*, p.name AS project_name, u.name AS assignee_name
      FROM tasks t JOIN projects p ON p.id=t.project_id
      LEFT JOIN users u ON u.id=t.assignee_id
      ORDER BY t.priority ASC, t.created_at ASC`, []);
  res.json({
    tasks: rows.map((t) => ({
      id: t.id, title: t.title, projectId: t.project_id, projectName: t.project_name,
      assigneeName: t.assignee_name || null, due: t.due, done: t.done,
      priority: t.priority == null ? 6 : Number(t.priority),
    })),
  });
}));

// Changer la priorité de n'importe quelle tâche (admin)
app.patch('/api/admin/tasks/:id/priority', auth, adminOnly, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const n = parseInt(req.body.priority, 10);
  if (!(n >= 1 && n <= 6)) return res.status(400).json({ error: 'Priorité invalide (1 à 6)' });
  await q('UPDATE tasks SET priority=$1 WHERE id=$2', [n, t.id]);
  await audit(req.user, 'task_priority', `« ${t.title} » → P${n}`);
  res.json({ ok: true, priority: n });
}));

// Tous les projets (avec propriétaire + compteurs)
app.get('/api/admin/projects', auth, adminOnly, h(async (req, res) => {
  const rows = await many(`SELECT p.*, u.name AS owner_name, u.email AS owner_email,
      (SELECT count(*) FROM memberships m WHERE m.project_id=p.id)::int AS "memberCount",
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id)::int AS "taskCount",
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id AND t.done)::int AS "doneCount"
    FROM projects p LEFT JOIN users u ON u.id=p.owner_id
    ORDER BY p.created_at DESC`, []);
  res.json({
    projects: rows.map((p) => ({
      id: p.id, name: p.name, type: p.type, status: p.status, deadline: p.deadline,
      ownerName: p.owner_name || '—', ownerEmail: p.owner_email || '',
      memberCount: p.memberCount, taskCount: p.taskCount, doneCount: p.doneCount, createdAt: p.created_at,
    })),
  });
}));

// Supprimer n'importe quel projet (admin) — notifie les membres
app.delete('/api/admin/projects/:id', auth, adminOnly, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const members = await projectMembers(p.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const mb of members) {
      if (mb.user_id === req.user.id) continue;
      await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)',
        [uid(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${p.name} » a été supprimé par l’administrateur. Vous n'en êtes plus membre.`]);
    }
    await client.query('DELETE FROM poll_votes WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [p.id]);
    await client.query('DELETE FROM poll_options WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [p.id]);
    await client.query('DELETE FROM polls WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM task_transfers WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM project_meeting_task_delegates WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM meeting_messages WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM tasks WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM invites WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM activity WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM member_roles WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM project_roles WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM memberships WHERE project_id=$1', [p.id]);
    await client.query('DELETE FROM projects WHERE id=$1', [p.id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  await audit(req.user, 'delete_project', `« ${p.name} »`);
  res.json({ ok: true });
}));

app.get('/api/health', h(async (req, res) => { await q('SELECT 1'); res.json({ ok: true, name: 'planii-backend', db: 'postgres' }); }));

/* ---------- rappels d'échéance (mail la veille, à 18h Europe/Paris) ---------- */
const parisHour = () => parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()), 10);
const parisDate = (offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offsetDays * 864e5));
async function runDeadlineReminders() {
  const tomorrow = parisDate(1);
  const today = parisDate(0);
  const tasks = await many(`SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.name AS project_name, u.email AS email
      FROM tasks t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due=$1 AND t.assignee_id IS NOT NULL`, [tomorrow]);
  let sent = 0;
  for (const t of tasks) {
    const already = await one('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, tomorrow]);
    if (already) continue;
    await q('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, tomorrow]);
    await sendMail(t.email, `Rappel : « ${t.title} » à rendre demain`, {
      intro: `La tâche « ${t.title} » du projet « ${t.project_name} » arrive à échéance demain.`,
      rows: [['Projet', t.project_name], ['Échéance', t.due], ['Priorité', 'P' + (t.priority || 6)]],
      ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL,
    });
    await notify(t.assignee_id, 'deadline', `Échéance demain : ${t.title}`, `Projet « ${t.project_name} »`);
    sent++;
  }
  const overdue = await many(`SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.id AS project_id, p.name AS project_name,
        u.name AS assignee_name, u.email AS assignee_email
      FROM tasks t
      JOIN projects p ON p.id=t.project_id
      JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due IS NOT NULL AND t.due < $1 AND t.assignee_id IS NOT NULL`, [today]);
  for (const t of overdue) {
    const markDate = today;
    const already = await one('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, markDate]);
    if (already) continue;
    await q('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, markDate]);
    const rows = [['Projet', t.project_name], ['Tâche', t.title], ['Responsable', t.assignee_name], ['Échéance', t.due], ['Priorité', 'P' + (t.priority || 6)]];
    await sendMail(t.assignee_email, `En retard : « ${t.title} »`, {
      intro: `Vous êtes en retard sur la tâche « ${t.title} » du projet « ${t.project_name} ».`,
      rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL,
    });
    await notify(t.assignee_id, 'task_overdue', `Tâche en retard : ${t.title}`, `Projet « ${t.project_name} »`);
    for (const manager of await projectManagers(t.project_id)) {
      if (!manager.email || manager.id === t.assignee_id) continue;
      await sendMail(manager.email, `Retard dans « ${t.project_name} »`, {
        intro: `${t.assignee_name} est en retard sur la tâche « ${t.title} ».`,
        rows, ctaText: 'Ouvrir Planii', ctaUrl: WEB_URL,
      });
    }
    sent++;
  }
  return sent;
}
let lastReminderDay = null;
function startReminderScheduler() {
  setInterval(async () => {
    try {
      const today = parisDate(0);
      if (parisHour() >= 18 && lastReminderDay !== today) {
        lastReminderDay = today;
        const n = await runDeadlineReminders();
        if (n) console.log(`Rappels d'échéance envoyés : ${n} (${today})`);
      }
    } catch (e) { console.error('scheduler', e.message); }
  }, 5 * 60 * 1000);
}

/* ---------- serveur HTTP + WebSocket (temps réel) ---------- */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.sub;
    ws.userId = userId; ws.isAlive = true;
    if (!wsClients.has(userId)) wsClients.set(userId, new Set());
    wsClients.get(userId).add(ws);
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => { const s = wsClients.get(userId); if (s) { s.delete(ws); if (!s.size) wsClients.delete(userId); } });
    ws.on('error', () => {});
    try { ws.send(JSON.stringify({ type: 'hello' })); } catch { /* noop */ }
  } catch (e) { try { ws.close(); } catch { /* noop */ } }
});
// heartbeat : ferme les connexions mortes (évite les fuites derrière Traefik)
setInterval(() => {
  wss.clients.forEach((ws) => { if (ws.isAlive === false) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch { /* noop */ } });
}, 30000);

initSchema()
  .then(() => {
    server.listen(PORT, () => console.log(`Planii backend (PostgreSQL + WebSocket) en écoute sur le port ${PORT} — APP_URL=${APP_URL}`));
    startReminderScheduler();
  })
  .catch((e) => { console.error('Échec init base de données:', e.message); process.exit(1); });
