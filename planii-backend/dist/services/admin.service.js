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
exports.getStats = getStats;
exports.listUsers = listUsers;
exports.deleteUser = deleteUser;
exports.setUserAdmin = setUserAdmin;
exports.listAudit = listAudit;
exports.listMail = listMail;
exports.readMail = readMail;
exports.sendMail = sendMail;
exports.replyMail = replyMail;
exports.listTasks = listTasks;
exports.setTaskPriority = setTaskPriority;
exports.listProjects = listProjects;
exports.deleteProject = deleteProject;
const pool_1 = require("../db/pool");
const env_1 = require("../config/env");
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const TaskModel = __importStar(require("../models/Task.model"));
const ProjectModel = __importStar(require("../models/Project.model"));
const UserModel = __importStar(require("../models/User.model"));
const UserView = __importStar(require("../views/User.view"));
const AdminView = __importStar(require("../views/Admin.view"));
const audit_service_1 = require("./audit.service");
const imap_service_1 = require("./imap.service");
const mail_service_1 = require("./mail.service");
const project_service_1 = require("./project.service");
const pagination_1 = require("../lib/pagination");
async function getStats() {
    const n = async (sql) => Number((await (0, pool_1.one)(sql, [])).c);
    const users = await n('SELECT count(*)::int AS c FROM users');
    const projects = await n('SELECT count(*)::int AS c FROM projects');
    const projectsActive = await n(`SELECT count(*)::int AS c FROM projects WHERE status <> 'done'`);
    const tasks = await n('SELECT count(*)::int AS c FROM tasks');
    const tasksDone = await n('SELECT count(*)::int AS c FROM tasks WHERE done');
    const tasksOverdue = await n(`SELECT count(*)::int AS c FROM tasks WHERE NOT done AND due IS NOT NULL AND due < to_char(now(),'YYYY-MM-DD')`);
    const active7 = await n(`SELECT count(*)::int AS c FROM users WHERE last_login > now() - interval '7 days'`);
    const prioRows = await (0, pool_1.many)('SELECT priority, count(*)::int AS c FROM tasks GROUP BY priority', []);
    const tasksByPriority = [1, 2, 3, 4, 5, 6].map((p) => ({ p, c: (prioRows.find((row) => Number(row.priority) === p) || {}).c || 0 }));
    const typeRows = await (0, pool_1.many)('SELECT type, count(*)::int AS c FROM projects GROUP BY type', []);
    const projectsByType = ['solo', 'team', 'group'].map((t) => ({ t, c: (typeRows.find((row) => row.type === t) || {}).c || 0 }));
    const doneRows = await (0, pool_1.many)(`SELECT to_char(done_at,'YYYY-MM-DD') AS d, count(*)::int AS c FROM tasks WHERE done AND done_at > now() - interval '14 days' GROUP BY d`, []);
    const doneByDay = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        doneByDay.push({ d, c: (doneRows.find((row) => row.d === d) || {}).c || 0 });
    }
    const recentLogins = (await (0, pool_1.many)('SELECT name, email, last_login FROM users WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 8', []))
        .map((u) => ({ name: u.name, email: u.email, lastLogin: u.last_login }));
    return {
        users, projects, projectsActive, tasks, tasksDone, tasksOpen: tasks - tasksDone, tasksOverdue,
        completion: tasks ? Math.round((tasksDone / tasks) * 100) : 0, activeUsers7: active7,
        tasksByPriority, projectsByType, doneByDay, recentLogins,
    };
}
async function listUsers(query = {}) {
    const { page, limit, offset } = (0, pagination_1.parsePagination)(query, { limit: 30 });
    const countRow = await (0, pool_1.one)('SELECT count(*)::int AS c FROM users', []);
    const total = Number(countRow.c) || 0;
    const users = await (0, pool_1.many)(`SELECT u.id, u.name, u.email, u.first_name, u.last_name, u.is_admin, u.created_at, u.last_login,
      (SELECT count(*)::int FROM memberships m WHERE m.user_id=u.id) AS project_count,
      (SELECT count(*)::int FROM tasks t WHERE t.assignee_id=u.id AND NOT t.done) AS tasks_open,
      (SELECT count(*)::int FROM tasks t WHERE t.assignee_id=u.id AND t.done) AS tasks_done,
      (SELECT coalesce(sum(
        CASE
          WHEN t.due IS NULL THEN 10
          WHEN t.done_at::date < t.due THEN 20
          WHEN t.done_at::date = t.due THEN 15
          ELSE 5
        END
      ), 0)::int FROM tasks t WHERE t.assignee_id=u.id AND t.done) AS points
    FROM users u ORDER BY u.created_at ASC LIMIT ${limit} OFFSET ${offset}`, []);
    const items = users.map((u) => AdminView.userRow(u, {
        projectCount: Number(u.project_count) || 0,
        tasksOpen: Number(u.tasks_open) || 0,
        tasksDone: Number(u.tasks_done) || 0,
        points: Number(u.points) || 0,
    }));
    return (0, pagination_1.paginated)(items, total, page, limit);
}
async function deleteUser(actor, targetId) {
    const target = await UserModel.findById(targetId);
    if (!target)
        (0, http_error_1.fail)(404, 'Utilisateur introuvable');
    if (target.id === actor.id)
        (0, http_error_1.fail)(400, 'Vous ne pouvez pas supprimer votre propre compte');
    if (UserView.isSuperAdmin(target))
        (0, http_error_1.fail)(400, 'Impossible de supprimer le super administrateur');
    if (UserView.isAdmin(target) && !UserView.isSuperAdmin(actor))
        (0, http_error_1.fail)(403, 'Seul le super administrateur peut supprimer un admin');
    const owned = await (0, pool_1.many)('SELECT id, name FROM projects WHERE owner_id=$1', [target.id]);
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        for (const pr of owned) {
            const members = await client.query('SELECT user_id FROM memberships WHERE project_id=$1', [pr.id]);
            for (const mb of members.rows) {
                if (mb.user_id === target.id)
                    continue;
                await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)', [(0, utils_1.uid)(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${pr.name} » a été supprimé par l’administrateur.`]);
            }
            await (0, project_service_1.deleteProjectCascade)(client, pr.id);
        }
        await client.query('UPDATE tasks SET assignee_id=NULL WHERE assignee_id=$1', [target.id]);
        await client.query('DELETE FROM poll_votes WHERE user_id=$1', [target.id]);
        await client.query('DELETE FROM member_roles WHERE user_id=$1', [target.id]);
        await client.query('DELETE FROM memberships WHERE user_id=$1', [target.id]);
        await client.query('DELETE FROM notifications WHERE user_id=$1', [target.id]);
        await client.query('DELETE FROM users WHERE id=$1', [target.id]);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
    await (0, audit_service_1.audit)(actor, 'delete_user', `${target.name} (${target.email})${owned.length ? ` + ${owned.length} projet(s)` : ''}`);
    return owned.length;
}
async function setUserAdmin(actor, targetId, admin) {
    const target = await UserModel.findById(targetId);
    if (!target)
        (0, http_error_1.fail)(404, 'Utilisateur introuvable');
    if (UserView.isSuperAdmin(target))
        (0, http_error_1.fail)(400, 'Le super administrateur est admin par défaut');
    await (0, pool_1.q)('UPDATE users SET is_admin=$1 WHERE id=$2', [admin, target.id]);
    await (0, audit_service_1.audit)(actor, admin ? 'grant_admin' : 'revoke_admin', `${target.name} (${target.email})`);
    return admin;
}
async function listAudit(query = {}) {
    const { page, limit, offset } = (0, pagination_1.parsePagination)(query, { limit: 50 });
    const countRow = await (0, pool_1.one)('SELECT count(*)::int AS c FROM admin_audit', []);
    const total = Number(countRow.c) || 0;
    const rows = await (0, pool_1.many)(`SELECT id,actor_name,action,detail,created_at FROM admin_audit
    ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, []);
    return (0, pagination_1.paginated)(rows, total, page, limit);
}
async function listMail() {
    if (!env_1.env.mailOn)
        (0, http_error_1.fail)(503, 'Boîte mail non configurée (SMTP_PASS absent sur le serveur).');
    try {
        return { messages: await (0, imap_service_1.imapList)(30), mailbox: env_1.env.SMTP_USER };
    }
    catch (e) {
        console.error('imap list', e.message);
        (0, http_error_1.fail)(502, 'Connexion à la boîte mail échouée : ' + e.message);
    }
}
async function readMail(uid) {
    if (!env_1.env.mailOn)
        (0, http_error_1.fail)(503, 'Boîte mail non configurée.');
    try {
        const m = await (0, imap_service_1.imapRead)(uid);
        if (!m)
            (0, http_error_1.fail)(404, 'Message introuvable');
        return m;
    }
    catch (e) {
        if (e instanceof http_error_1.HttpError)
            throw e;
        console.error('imap read', e.message);
        (0, http_error_1.fail)(502, 'Lecture du message échouée : ' + e.message);
    }
}
async function sendMail(actor, body) {
    const to = (body.to || '').trim();
    const subject = (body.subject || '').trim();
    const text = String(body.body || '');
    if (!to || !subject)
        (0, http_error_1.fail)(400, 'Destinataire et objet requis');
    try {
        await (0, mail_service_1.sendRaw)({ to, subject, text });
        await (0, audit_service_1.audit)(actor, 'mail_sent', `→ ${to} : ${subject}`);
    }
    catch (e) {
        (0, http_error_1.fail)(502, 'Envoi échoué : ' + e.message);
    }
}
async function replyMail(actor, uid, body) {
    const text = String(body || '');
    try {
        const orig = await (0, imap_service_1.imapRead)(uid);
        if (!orig)
            (0, http_error_1.fail)(404, 'Message introuvable');
        const to = orig.replyTo || orig.from;
        const subject = /^re\s*:/i.test(orig.subject) ? orig.subject : ('Re: ' + orig.subject);
        await (0, mail_service_1.sendRaw)({ to, subject, text, inReplyTo: orig.messageId });
        await (0, audit_service_1.audit)(actor, 'mail_reply', `→ ${to} : ${subject}`);
    }
    catch (e) {
        if (e instanceof http_error_1.HttpError)
            throw e;
        (0, http_error_1.fail)(502, 'Réponse échouée : ' + e.message);
    }
}
async function listTasks(query = {}) {
    const { page, limit, offset } = (0, pagination_1.parsePagination)(query, { limit: 50 });
    const countRow = await (0, pool_1.one)('SELECT count(*)::int AS c FROM tasks', []);
    const total = Number(countRow.c) || 0;
    const rows = await (0, pool_1.many)(`SELECT t.*, p.name AS project_name, u.name AS assignee_name
    FROM tasks t JOIN projects p ON p.id=t.project_id
    LEFT JOIN users u ON u.id=t.assignee_id
    ORDER BY t.priority ASC, t.created_at ASC
    LIMIT ${limit} OFFSET ${offset}`, []);
    const items = rows.map((t) => AdminView.adminTask(t));
    return (0, pagination_1.paginated)(items, total, page, limit);
}
async function setTaskPriority(actor, taskId, priority) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const n = parseInt(String(priority), 10);
    if (!(n >= 1 && n <= 6))
        (0, http_error_1.fail)(400, 'Priorité invalide (1 à 6)');
    await (0, pool_1.q)('UPDATE tasks SET priority=$1 WHERE id=$2', [n, t.id]);
    await (0, audit_service_1.audit)(actor, 'task_priority', `« ${t.title} » → P${n}`);
    return n;
}
async function listProjects(query = {}) {
    const { page, limit, offset } = (0, pagination_1.parsePagination)(query, { limit: 30 });
    const countRow = await (0, pool_1.one)('SELECT count(*)::int AS c FROM projects', []);
    const total = Number(countRow.c) || 0;
    const rows = await (0, pool_1.many)(`SELECT p.*, u.name AS owner_name, u.email AS owner_email,
    (SELECT count(*) FROM memberships m WHERE m.project_id=p.id)::int AS "memberCount",
    (SELECT count(*) FROM tasks t WHERE t.project_id=p.id)::int AS "taskCount",
    (SELECT count(*) FROM tasks t WHERE t.project_id=p.id AND t.done)::int AS "doneCount"
  FROM projects p LEFT JOIN users u ON u.id=p.owner_id
  ORDER BY p.created_at DESC
  LIMIT ${limit} OFFSET ${offset}`, []);
    const items = rows.map((p) => AdminView.adminProject(p));
    return (0, pagination_1.paginated)(items, total, page, limit);
}
async function deleteProject(actor, projectId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const members = await ProjectModel.findMembers(p.id);
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        for (const mb of members) {
            if (mb.user_id === actor.id)
                continue;
            await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)', [(0, utils_1.uid)(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${p.name} » a été supprimé par l’administrateur. Vous n'en êtes plus membre.`]);
        }
        await (0, project_service_1.deleteProjectCascade)(client, p.id);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
    await (0, audit_service_1.audit)(actor, 'delete_project', `« ${p.name} »`);
}
//# sourceMappingURL=admin.service.js.map