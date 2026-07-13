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
exports.listMessages = listMessages;
exports.postMessage = postMessage;
exports.listTaskDelegates = listTaskDelegates;
exports.setTaskDelegates = setTaskDelegates;
exports.createMeetingTask = createMeetingTask;
const pool_1 = require("../db/pool");
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const ProjectModel = __importStar(require("../models/Project.model"));
const project_service_1 = require("./project.service");
const notification_service_1 = require("./notification.service");
async function listMessages(projectId, userId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    (0, project_service_1.assertProjectOpen)(p);
    const rows = await (0, pool_1.many)(`SELECT mm.*, u.name AS user_name
    FROM meeting_messages mm JOIN users u ON u.id=mm.user_id
    WHERE mm.project_id=$1 ORDER BY mm.created_at ASC LIMIT 200`, [p.id]);
    return rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        userName: row.user_name,
        body: row.body,
        createdTaskId: row.created_task_id || null,
        at: row.created_at,
    }));
}
async function postMessage(projectId, user, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, user.id);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    (0, project_service_1.assertProjectOpen)(p);
    const text = String(body || '').trim().slice(0, 1200);
    if (!text)
        (0, http_error_1.fail)(400, 'Message vide');
    const id = (0, utils_1.uid)();
    await (0, pool_1.q)('INSERT INTO meeting_messages (id,project_id,user_id,body) VALUES ($1,$2,$3,$4)', [id, p.id, user.id, text]);
    await (0, notification_service_1.notifyProject)(p.id, { type: 'meeting_chat', projectId: p.id });
    return { id, projectId: p.id, userId: user.id, userName: user.name, body: text, createdTaskId: null, at: new Date().toISOString() };
}
async function listTaskDelegates(projectId, userId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    (0, project_service_1.assertProjectOpen)(p);
    const rows = await (0, pool_1.many)('SELECT user_id FROM project_meeting_task_delegates WHERE project_id=$1', [p.id]);
    return rows.map((row) => row.user_id);
}
async function setTaskDelegates(projectId, userId, userIds) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au chef du projet');
    (0, project_service_1.assertProjectOpen)(p);
    const wanted = Array.isArray(userIds) ? [...new Set(userIds.filter(Boolean))] : [];
    const members = await ProjectModel.findMembers(p.id);
    const memberIds = new Set(members.map((x) => x.user_id));
    const ids = wanted.filter((id) => typeof id === 'string' && memberIds.has(id));
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM project_meeting_task_delegates WHERE project_id=$1', [p.id]);
        for (const id of ids)
            await client.query('INSERT INTO project_meeting_task_delegates (project_id,user_id,created_by) VALUES ($1,$2,$3)', [p.id, id, userId]);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
    await (0, notification_service_1.notifyProject)(p.id, { type: 'meeting_chat', projectId: p.id });
    return ids;
}
async function createMeetingTask(projectId, user, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, user.id);
    (0, project_service_1.assertProjectOpen)(p);
    const delegated = await (0, pool_1.one)('SELECT 1 FROM project_meeting_task_delegates WHERE project_id=$1 AND user_id=$2', [p.id, user.id]);
    if (!m || !(ProjectModel.canManageRole(m.role) || delegated))
        (0, http_error_1.fail)(403, 'Vous n’êtes pas autorisé à créer des tâches depuis ce meeting');
    const title = String(body.title || '').trim().slice(0, 160);
    if (!title)
        (0, http_error_1.fail)(400, 'Titre requis');
    const assignee = body.assigneeId || null;
    if (assignee && !(await ProjectModel.findMembership(p.id, assignee)))
        (0, http_error_1.fail)(400, 'Le responsable doit être membre');
    const statuses = await (0, project_service_1.ensureProjectStatuses)(p.id);
    const statusKey = statuses.some((s) => s.key === body.statusKey) ? body.statusKey : 'todo';
    const prio = (0, utils_1.prioOrDefault)(body.priority);
    const description = String(body.description || '').trim().slice(0, 1000) || null;
    const transferable = body.transferable === true;
    const id = (0, utils_1.uid)();
    if (statusKey === 'transferred' && !transferable)
        (0, http_error_1.fail)(400, 'Cette tâche doit être marquée transférable');
    await (0, pool_1.q)('INSERT INTO tasks (id,project_id,title,description,type,assignee_id,created_by,due,priority,status_key,done,done_at,transferable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [id, p.id, title, description, 'Tâche', assignee, user.id, body.due || null, prio, statusKey, statusKey === 'done', statusKey === 'done' ? new Date().toISOString() : null, transferable]);
    await (0, notification_service_1.recordTaskEvent)(id, p.id, user.id, 'task_created', { title, assigneeId: assignee, due: body.due || null, priority: prio, statusKey, source: 'meeting' });
    const sourceMessageId = body.messageId || null;
    if (sourceMessageId)
        await (0, pool_1.q)('UPDATE meeting_messages SET created_task_id=$1 WHERE id=$2 AND project_id=$3', [id, sourceMessageId, p.id]);
    await (0, notification_service_1.logActivity)(p.id, user.id, 'meeting_task_created', `a créé depuis le meeting « ${title} »`);
    if (assignee) {
        await (0, project_service_1.sendTaskAssignmentMails)({ project: p, task: { id, title, priority: prio, due: body.due || null }, actor: user, assigneeId: assignee, source: 'meeting' });
    }
    await (0, notification_service_1.notifyProject)(p.id, { type: 'meeting_chat', projectId: p.id });
    await (0, notification_service_1.notifyProject)(p.id, { type: 'project', projectId: p.id });
    return { id, title, description, type: 'Tâche', assigneeId: assignee, createdBy: user.id, due: body.due || null, done: statusKey === 'done', priority: prio, statusKey, transferable };
}
//# sourceMappingURL=meeting.service.js.map