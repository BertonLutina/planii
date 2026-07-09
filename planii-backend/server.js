/* ===== Planii backend — Express + PostgreSQL ===== */
'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS job text`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS task_types jsonb`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_library jsonb`);
  await q(`CREATE TABLE IF NOT EXISTS admin_audit (
    id text PRIMARY KEY, actor_id text, actor_name text, action text NOT NULL,
    detail text, created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE TABLE IF NOT EXISTS projects (
    id text PRIMARY KEY, name text NOT NULL, type text NOT NULL,
    owner_id text NOT NULL, status text NOT NULL DEFAULT 'active',
    deadline text, created_at timestamptz NOT NULL DEFAULT now(), done_at timestamptz);`);
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
  await q(`CREATE TABLE IF NOT EXISTS project_roles (
    id text PRIMARY KEY, project_id text NOT NULL, name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now());`);
  await q(`CREATE TABLE IF NOT EXISTS member_roles (
    project_id text NOT NULL, user_id text NOT NULL, role_id text NOT NULL,
    PRIMARY KEY(project_id, user_id, role_id));`);
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
const taskTypesOf = (u) => (u && Array.isArray(u.task_types) && u.task_types.length) ? u.task_types : DEFAULT_TASK_TYPES;
const roleLibraryOf = (u) => (u && Array.isArray(u.role_library)) ? u.role_library : [];
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

const userByEmail = (e) => one('SELECT * FROM users WHERE email=$1', [e]);
const userById = (id) => one('SELECT * FROM users WHERE id=$1', [id]);
const projectById = (id) => one('SELECT * FROM projects WHERE id=$1', [id]);
const taskById = (id) => one('SELECT * FROM tasks WHERE id=$1', [id]);
const membership = (pid, uidv) => one('SELECT * FROM memberships WHERE project_id=$1 AND user_id=$2', [pid, uidv]);
async function logActivity(projectId, userId, type, detail) {
  await q('INSERT INTO activity (id,project_id,user_id,type,detail) VALUES ($1,$2,$3,$4,$5)', [uid(), projectId, userId, type, detail || '']);
}
async function notify(userId, type, title, detail) {
  await q('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)', [uid(), userId, type, title, detail || '']);
}
const projectMembers = (pid) => many('SELECT user_id, role FROM memberships WHERE project_id=$1', [pid]);

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

/* ---------- projects ---------- */
const CREATOR_ROLE = { solo: 'owner', team: 'lead', group: 'owner' };
app.post('/api/projects', auth, h(async (req, res) => {
  const name = (req.body.name || '').trim();
  const type = req.body.type;
  if (!name) return res.status(400).json({ error: 'Nom du projet requis' });
  if (!['solo', 'team', 'group'].includes(type)) return res.status(400).json({ error: 'Type invalide' });
  const id = uid(); const role = CREATOR_ROLE[type];
  await q('INSERT INTO projects (id,name,type,owner_id,deadline) VALUES ($1,$2,$3,$4,$5)', [id, name, type, req.user.id, req.body.deadline || null]);
  await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4)', [uid(), id, req.user.id, role]);
  await logActivity(id, req.user.id, 'project_created', `a créé le projet « ${name} »`);
  const p = await projectById(id);
  res.json({ project: { ...p, my_role: role, taskCount: 0, doneCount: 0 } });
}));

app.get('/api/projects', auth, h(async (req, res) => {
  const rows = await many(`SELECT p.*, m.role AS my_role,
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id)::int AS "taskCount",
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id AND t.done)::int AS "doneCount"
    FROM projects p JOIN memberships m ON m.project_id=p.id
    WHERE m.user_id=$1 ORDER BY p.created_at DESC`, [req.user.id]);
  res.json({ projects: rows });
}));

async function projectDetail(p, userId) {
  const roles = await many('SELECT id, name FROM project_roles WHERE project_id=$1 ORDER BY created_at ASC', [p.id]);
  const mroles = await many('SELECT user_id, role_id FROM member_roles WHERE project_id=$1', [p.id]);
  const rolesByMember = {};
  for (const r of mroles) (rolesByMember[r.user_id] = rolesByMember[r.user_id] || []).push(r.role_id);
  const members = (await many(`SELECT m.user_id AS id, m.role, u.name, u.email, u.job
      FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY m.joined_at`, [p.id]))
    .map(m => ({ id: m.id, role: m.role, name: m.name, email: m.email, job: m.job || '', roleIds: rolesByMember[m.id] || [] }));
  const tasks = (await many('SELECT * FROM tasks WHERE project_id=$1 ORDER BY priority ASC, created_at ASC', [p.id]))
    .map(t => ({ id: t.id, title: t.title, description: t.description || null, type: t.type || null, assigneeId: t.assignee_id, createdBy: t.created_by, due: t.due, done: t.done, doneAt: t.done_at, estHours: t.est_hours == null ? null : Number(t.est_hours), spentHours: t.spent_hours == null ? null : Number(t.spent_hours), priority: t.priority == null ? 6 : Number(t.priority), parentId: t.parent_id || null }));
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
  return { ...p, roles, members, tasks, polls, activity };
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
  await q(`UPDATE projects SET status='done', done_at=now() WHERE id=$1`, [p.id]);
  await logActivity(p.id, req.user.id, 'project_closed', 'a clôturé le projet');
  res.json({ ok: true });
}));

// Modifier un projet — réservé au propriétaire
app.patch('/api/projects/:id', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  if (p.owner_id !== req.user.id) return res.status(403).json({ error: 'Seul le propriétaire peut modifier le projet' });
  const sets = [], vals = [];
  if (typeof req.body.name === 'string') {
    const name = req.body.name.trim();
    if (!name) return res.status(400).json({ error: 'Le nom ne peut pas être vide' });
    sets.push(`name=$${sets.length + 1}`); vals.push(name);
  }
  if ('deadline' in req.body) { sets.push(`deadline=$${sets.length + 1}`); vals.push(req.body.deadline || null); }
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
  const role = req.body.role;
  const allowed = { solo: ['client'], team: ['client', 'provider'], group: ['member'] };
  if (!allowed[p.type].includes(role)) return res.status(400).json({ error: 'Rôle invalide pour ce type de projet' });
  const t = newToken();
  const expires = new Date(Date.now() + INVITE_DAYS * 864e5).toISOString();
  const multi = role !== 'client';
  await q('INSERT INTO invites (token,project_id,role,email,created_by,expires_at,multi) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [t, p.id, role, (req.body.email || '').trim().toLowerCase() || null, req.user.id, expires, multi]);
  await logActivity(p.id, req.user.id, 'invite_created', `a créé une invitation (${role})`);
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
  if (await membership(p.id, req.user.id)) return res.json({ project: { id: p.id }, already: true });
  await q('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4) ON CONFLICT (project_id,user_id) DO NOTHING', [uid(), p.id, req.user.id, inv.role]);
  await q('UPDATE invites SET uses=uses+1 WHERE token=$1', [inv.token]);
  await logActivity(p.id, req.user.id, 'member_joined', `${req.user.name} a rejoint (${inv.role})`);
  res.json({ project: { id: p.id }, role: inv.role });
}));

/* ---------- rôles de projet (fonctions assignées aux membres) ---------- */
// Créer un rôle dans le projet — propriétaire ou leader
app.post('/api/projects/:id/roles', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
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
  const role = await one('SELECT * FROM project_roles WHERE id=$1 AND project_id=$2', [req.params.roleId, p.id]);
  if (!role) return res.status(404).json({ error: 'Rôle introuvable' });
  await q('DELETE FROM member_roles WHERE project_id=$1 AND role_id=$2', [p.id, role.id]);
  await q('DELETE FROM project_roles WHERE id=$1', [role.id]);
  res.json({ ok: true });
}));

// Assigner la liste des rôles d'un membre — propriétaire ou leader
app.put('/api/projects/:id/members/:userId/roles', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m || !canManage(m.role)) return res.status(403).json({ error: 'Réservé au propriétaire ou leader' });
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

/* ---------- tasks ---------- */
app.post('/api/projects/:id/tasks', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Intitulé requis' });
  const assignee = req.body.assigneeId || null;
  if (assignee && !(await membership(p.id, assignee))) return res.status(400).json({ error: 'Le responsable doit être membre' });
  const id = uid();
  const est = numOrNull(req.body.estHours);
  const prio = prioOrDefault(req.body.priority);
  const description = (req.body.description || '').trim() || null;
  const type = (req.body.type || '').trim().slice(0, 30) || null;
  let parentId = req.body.parentId || null;
  if (parentId) {
    const parent = await taskById(parentId);
    if (!parent || parent.project_id !== p.id) return res.status(400).json({ error: 'Tâche parente invalide' });
    if (parent.parent_id) parentId = parent.parent_id; // pas de sous-sous-tâche : rattache au parent racine
  }
  await q('INSERT INTO tasks (id,project_id,title,description,type,assignee_id,created_by,due,est_hours,priority,parent_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [id, p.id, title, description, type, assignee, req.user.id, req.body.due || null, est, prio, parentId]);
  await logActivity(p.id, req.user.id, 'task_created', `a ajouté « ${title} »`);
  res.json({ task: { id, title, description, type, assigneeId: assignee, createdBy: req.user.id, due: req.body.due || null, done: false, estHours: est, spentHours: null, priority: prio, parentId } });
}));

app.patch('/api/tasks/:id', auth, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const m = await membership(t.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  const b = req.body || {};
  const isCreator = t.created_by === req.user.id;
  const isAssignee = t.assignee_id === req.user.id;
  const manage = canManage(m.role);

  // Cocher / décocher : réservé au responsable
  if (typeof b.done === 'boolean') {
    if (!isAssignee) return res.status(403).json({ error: 'Seul le responsable de la tâche peut la cocher' });
    await q('UPDATE tasks SET done=$1, done_at=$2 WHERE id=$3', [b.done, b.done ? new Date().toISOString() : null, t.id]);
    if (b.done) await logActivity(t.project_id, req.user.id, 'task_done', `a terminé « ${t.title} »`);
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
  if ('title' in b || 'description' in b || 'type' in b || 'due' in b || 'assigneeId' in b) {
    if (!(isCreator || manage)) return res.status(403).json({ error: 'Modification réservée au créateur ou au propriétaire' });
    const sets = [], vals = [];
    if ('title' in b) {
      const title = (b.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Intitulé requis' });
      sets.push(`title=$${sets.length + 1}`); vals.push(title);
    }
    if ('description' in b) { sets.push(`description=$${sets.length + 1}`); vals.push((b.description || '').trim() || null); }
    if ('type' in b) { sets.push(`type=$${sets.length + 1}`); vals.push((b.type || '').trim().slice(0, 30) || null); }
    if ('due' in b) { sets.push(`due=$${sets.length + 1}`); vals.push(b.due || null); }
    if ('assigneeId' in b) {
      const a = b.assigneeId || null;
      if (a && !(await membership(t.project_id, a))) return res.status(400).json({ error: 'Le responsable doit être membre' });
      sets.push(`assignee_id=$${sets.length + 1}`); vals.push(a);
    }
    if (sets.length) { vals.push(t.id); await q(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals); }
    await logActivity(t.project_id, req.user.id, 'task_updated', `a modifié « ${t.title} »`);
  }

  res.json({ ok: true });
}));

app.post('/api/tasks/:id/claim', auth, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const m = await membership(t.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  if (t.assignee_id) return res.status(409).json({ error: 'Tâche déjà prise' });
  await q('UPDATE tasks SET assignee_id=$1 WHERE id=$2', [req.user.id, t.id]);
  await logActivity(t.project_id, req.user.id, 'task_claimed', `a pris « ${t.title} »`);
  res.json({ ok: true });
}));

app.delete('/api/tasks/:id', auth, h(async (req, res) => {
  const t = await taskById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tâche introuvable' });
  const m = await membership(t.project_id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
  if (t.created_by !== req.user.id && !canManage(m.role)) return res.status(403).json({ error: 'Suppression réservée au créateur ou au propriétaire' });
  await q('DELETE FROM tasks WHERE id=$1 OR parent_id=$1', [t.id]);
  res.json({ ok: true });
}));

/* ---------- polls ---------- */
app.post('/api/projects/:id/polls', auth, h(async (req, res) => {
  const p = await projectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Projet introuvable' });
  const m = await membership(p.id, req.user.id);
  if (!m) return res.status(403).json({ error: 'Non membre' });
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
  const opt = await one('SELECT * FROM poll_options WHERE poll_id=$1 AND id=$2', [poll.id, req.body.optionId]);
  if (!opt) return res.status(400).json({ error: 'Option invalide' });
  await q(`INSERT INTO poll_votes (poll_id,option_id,user_id) VALUES ($1,$2,$3)
    ON CONFLICT (poll_id,user_id) DO UPDATE SET option_id=excluded.option_id`, [poll.id, opt.id, req.user.id]);
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
  res.json({ stats: { users, projects, projectsActive, tasks, tasksDone, tasksOverdue, completion: tasks ? Math.round((tasksDone / tasks) * 100) : 0 } });
}));

// Liste de tous les utilisateurs (avec points, nb projets, nb tâches)
app.get('/api/admin/users', auth, adminOnly, h(async (req, res) => {
  const users = await many('SELECT id,name,email,first_name,last_name,is_admin,created_at FROM users ORDER BY created_at ASC', []);
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
      createdAt: u.created_at, admin: isAdmin(u), superAdmin: isSuperAdmin(u),
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

initSchema()
  .then(() => app.listen(PORT, () => console.log(`Planii backend (PostgreSQL) en écoute sur le port ${PORT} — APP_URL=${APP_URL}`)))
  .catch((e) => { console.error('Échec init base de données:', e.message); process.exit(1); });
