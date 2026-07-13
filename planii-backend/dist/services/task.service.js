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
exports.reorderTasks = reorderTasks;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.claimTask = claimTask;
exports.remindTask = remindTask;
exports.deleteTask = deleteTask;
exports.listComments = listComments;
exports.addComment = addComment;
exports.deleteComment = deleteComment;
exports.listEvents = listEvents;
exports.listMyTasks = listMyTasks;
const pool_1 = require("../db/pool");
const env_1 = require("../config/env");
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const TaskModel = __importStar(require("../models/Task.model"));
const ProjectModel = __importStar(require("../models/Project.model"));
const UserModel = __importStar(require("../models/User.model"));
const TaskView = __importStar(require("../views/Task.view"));
const project_service_1 = require("./project.service");
const notification_service_1 = require("./notification.service");
const mail_service_1 = require("./mail.service");
async function reorderTasks(projectId, userId, ids) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    (0, project_service_1.assertProjectOpen)(p);
    const m = await ProjectModel.findMembership(projectId, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < ids.length; i++)
            await client.query('UPDATE tasks SET position=$1 WHERE id=$2 AND project_id=$3', [i, ids[i], projectId]);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
    (0, notification_service_1.bump)(projectId);
}
async function createTask(projectId, user, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, user.id);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    (0, project_service_1.assertProjectOpen)(p);
    const title = String(body.title || '').trim();
    if (!title)
        (0, http_error_1.fail)(400, 'Intitulé requis');
    const assignee = body.assigneeId || null;
    if (assignee && !(await ProjectModel.findMembership(p.id, assignee)))
        (0, http_error_1.fail)(400, 'Le responsable doit être membre');
    const id = (0, utils_1.uid)();
    const est = (0, utils_1.numOrNull)(body.estHours);
    const prio = (0, utils_1.prioOrDefault)(body.priority);
    const description = (body.description || '').trim() || null;
    const type = (body.type || '').trim().slice(0, 30) || null;
    const transferable = body.transferable === true;
    const statuses = await (0, project_service_1.ensureProjectStatuses)(p.id);
    const statusKey = statuses.some((s) => s.key === body.statusKey) ? body.statusKey : 'todo';
    if (statusKey === 'transferred' && !transferable)
        (0, http_error_1.fail)(400, 'Cette tâche doit être marquée transférable');
    let parentId = body.parentId || null;
    if (parentId) {
        const parent = await TaskModel.findById(parentId);
        if (!parent || parent.project_id !== p.id)
            (0, http_error_1.fail)(400, 'Tâche parente invalide');
        if (parent.parent_id)
            parentId = parent.parent_id;
    }
    await (0, pool_1.q)('INSERT INTO tasks (id,project_id,title,description,type,assignee_id,created_by,due,est_hours,priority,parent_id,status_key,done,done_at,transferable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [id, p.id, title, description, type, assignee, user.id, body.due || null, est, prio, parentId, statusKey, statusKey === 'done', statusKey === 'done' ? new Date().toISOString() : null, transferable]);
    await (0, notification_service_1.logActivity)(p.id, user.id, 'task_created', `a ajouté « ${title} »`);
    await (0, notification_service_1.recordTaskEvent)(id, p.id, user.id, 'task_created', { title, assigneeId: assignee, due: body.due || null, priority: prio, statusKey });
    (async () => {
        if (assignee) {
            await (0, project_service_1.sendTaskAssignmentMails)({ project: p, task: { id, title, priority: prio, due: body.due || null }, actor: user, assigneeId: assignee });
        }
        else {
            const rows = [['Projet', p.name], ['Priorité', 'P' + prio], type ? ['Type', type] : null, body.due ? ['Échéance', body.due] : null];
            for (const manager of await UserModel.projectManagers(p.id)) {
                if (manager.email && manager.id !== user.id)
                    await (0, mail_service_1.sendMail)(manager.email, `Nouvelle tâche dans « ${p.name} » : ${title}`, { intro: `${user.name} a ajouté une tâche non assignée au projet « ${p.name} ».`, rows, ctaText: 'Ouvrir Planii', ctaUrl: env_1.env.webUrl });
            }
        }
    })().catch((e) => console.error('mail task_created', e.message));
    return { id, title, description, type, assigneeId: assignee, createdBy: user.id, due: body.due || null, done: statusKey === 'done', estHours: est, spentHours: null, priority: prio, parentId, statusKey, transferable };
}
async function updateTask(taskId, user, body) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const m = await ProjectModel.findMembership(t.project_id, user.id);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const p = await ProjectModel.findById(t.project_id);
    (0, project_service_1.assertProjectOpen)(p);
    const b = body || {};
    const isCreator = t.created_by === user.id;
    const isAssignee = t.assignee_id === user.id;
    const manage = ProjectModel.canManageRole(m.role);
    if (typeof b.done === 'boolean') {
        if (!isAssignee)
            (0, http_error_1.fail)(403, 'Seul le responsable de la tâche peut la cocher');
        await (0, pool_1.q)('UPDATE tasks SET done=$1, done_at=$2, status_key=$3 WHERE id=$4', [b.done, b.done ? new Date().toISOString() : null, b.done ? 'done' : 'todo', t.id]);
        if (b.done)
            await (0, notification_service_1.logActivity)(t.project_id, user.id, 'task_done', `a terminé « ${t.title} »`);
        await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, user.id, b.done ? 'task_done' : 'task_reopened', { title: t.title });
    }
    if ('statusKey' in b || 'transferredTo' in b) {
        if (!(isAssignee || isCreator || manage))
            (0, http_error_1.fail)(403, 'Statut réservé au responsable, au créateur ou au propriétaire');
        const statuses = await (0, project_service_1.ensureProjectStatuses)(t.project_id);
        const nextStatus = statuses.some((s) => s.key === b.statusKey) ? b.statusKey : t.status_key || 'todo';
        let transferredTo = 'transferredTo' in b ? (b.transferredTo || null) : t.transferred_to;
        if (transferredTo && !(await ProjectModel.findMembership(t.project_id, transferredTo)))
            (0, http_error_1.fail)(400, 'Le destinataire doit être membre');
        const isTransfer = nextStatus === 'transferred';
        if (isTransfer && !t.transferable)
            (0, http_error_1.fail)(400, 'Cette tâche n’est pas transférable');
        if (isTransfer && !transferredTo)
            (0, http_error_1.fail)(400, 'Choisissez la personne à qui transférer');
        if (isTransfer && transferredTo === t.assignee_id)
            (0, http_error_1.fail)(400, 'Choisissez une autre personne');
        const done = nextStatus === 'done';
        await (0, pool_1.q)(`UPDATE tasks SET status_key=$1, done=$2, done_at=$3, transferred_from=$4, transferred_to=$5, assignee_id=$6 WHERE id=$7`, [nextStatus, done, done ? (t.done_at || new Date().toISOString()) : null, isTransfer ? (t.assignee_id || user.id) : null, isTransfer ? transferredTo : null, isTransfer ? transferredTo : t.assignee_id, t.id]);
        await (0, notification_service_1.logActivity)(t.project_id, user.id, 'task_status', `a déplacé « ${t.title} » vers ${nextStatus}`);
        await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, user.id, isTransfer ? 'task_transferred' : 'task_status_changed', { fromStatus: t.status_key || 'todo', toStatus: nextStatus, transferredTo });
        if (isTransfer) {
            await (0, pool_1.q)('INSERT INTO task_transfers (id,task_id,project_id,from_user_id,to_user_id,created_by) VALUES ($1,$2,$3,$4,$5,$6)', [(0, utils_1.uid)(), t.id, t.project_id, t.assignee_id || user.id, transferredTo, user.id]);
            if (transferredTo !== user.id)
                await (0, notification_service_1.notify)(transferredTo, 'task_transferred', `Tâche transférée : ${t.title}`, `${user.name} vous a transféré une tâche.`);
            const proj = await ProjectModel.findById(t.project_id);
            await (0, project_service_1.sendTaskAssignmentMails)({ project: proj, task: { id: t.id, title: t.title, priority: t.priority, due: t.due }, actor: user, assigneeId: transferredTo });
        }
    }
    if ('estHours' in b || 'spentHours' in b) {
        if (!(isAssignee || manage))
            (0, http_error_1.fail)(403, 'Heures réservées au responsable ou au propriétaire');
        const sets = [];
        const vals = [];
        if ('estHours' in b) {
            sets.push(`est_hours=$${sets.length + 1}`);
            vals.push((0, utils_1.numOrNull)(b.estHours));
        }
        if ('spentHours' in b) {
            sets.push(`spent_hours=$${sets.length + 1}`);
            vals.push((0, utils_1.numOrNull)(b.spentHours));
        }
        if (sets.length) {
            vals.push(t.id);
            await (0, pool_1.q)(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
        }
        await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, user.id, 'task_hours_updated', { estHours: 'estHours' in b ? (0, utils_1.numOrNull)(b.estHours) : undefined, spentHours: 'spentHours' in b ? (0, utils_1.numOrNull)(b.spentHours) : undefined });
    }
    if ('priority' in b) {
        if (!(isAssignee || isCreator || manage))
            (0, http_error_1.fail)(403, 'Priorité réservée au responsable, au créateur ou au propriétaire');
        const n = parseInt(String(b.priority), 10);
        if (!(n >= 1 && n <= 6))
            (0, http_error_1.fail)(400, 'Priorité invalide (1 à 6)');
        await (0, pool_1.q)('UPDATE tasks SET priority=$1 WHERE id=$2', [n, t.id]);
        await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, user.id, 'task_priority_changed', { fromPriority: t.priority || 6, toPriority: n });
    }
    if ('title' in b || 'description' in b || 'type' in b || 'due' in b || 'assigneeId' in b || 'transferable' in b) {
        if (!(isCreator || manage))
            (0, http_error_1.fail)(403, 'Modification réservée au créateur ou au propriétaire');
        const sets = [];
        const vals = [];
        let nextTitle = t.title;
        let nextDue = t.due || null;
        let nextAssignee = t.assignee_id || null;
        if ('title' in b) {
            const title = (b.title || '').trim();
            if (!title)
                (0, http_error_1.fail)(400, 'Intitulé requis');
            sets.push(`title=$${sets.length + 1}`);
            vals.push(title);
            nextTitle = title;
        }
        if ('description' in b) {
            sets.push(`description=$${sets.length + 1}`);
            vals.push((b.description || '').trim() || null);
        }
        if ('type' in b) {
            sets.push(`type=$${sets.length + 1}`);
            vals.push((b.type || '').trim().slice(0, 30) || null);
        }
        if ('due' in b) {
            sets.push(`due=$${sets.length + 1}`);
            vals.push(b.due || null);
            nextDue = b.due || null;
        }
        if ('assigneeId' in b) {
            const a = b.assigneeId || null;
            if (a && !(await ProjectModel.findMembership(t.project_id, a)))
                (0, http_error_1.fail)(400, 'Le responsable doit être membre');
            sets.push(`assignee_id=$${sets.length + 1}`);
            vals.push(a);
            nextAssignee = a;
        }
        if ('transferable' in b) {
            sets.push(`transferable=$${sets.length + 1}`);
            vals.push(b.transferable === true);
        }
        if (sets.length) {
            vals.push(t.id);
            await (0, pool_1.q)(`UPDATE tasks SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
        }
        await (0, notification_service_1.logActivity)(t.project_id, user.id, 'task_updated', `a modifié « ${t.title} »`);
        await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, user.id, 'task_updated', { title: nextTitle, assigneeId: nextAssignee, due: nextDue });
        if ('assigneeId' in b && nextAssignee && nextAssignee !== t.assignee_id) {
            const proj = await ProjectModel.findById(t.project_id);
            await (0, project_service_1.sendTaskAssignmentMails)({ project: proj, task: { id: t.id, title: nextTitle, priority: t.priority || b.priority, due: nextDue }, actor: user, assigneeId: nextAssignee });
        }
    }
    (0, notification_service_1.bump)(t.project_id);
}
async function claimTask(taskId, userId) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const m = await ProjectModel.findMembership(t.project_id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const p = await ProjectModel.findById(t.project_id);
    (0, project_service_1.assertProjectOpen)(p);
    if (t.assignee_id)
        (0, http_error_1.fail)(409, 'Tâche déjà prise');
    await (0, pool_1.q)('UPDATE tasks SET assignee_id=$1 WHERE id=$2', [userId, t.id]);
    await (0, notification_service_1.logActivity)(t.project_id, userId, 'task_claimed', `a pris « ${t.title} »`);
    await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, userId, 'task_claimed', { assigneeId: userId });
}
async function remindTask(taskId, user) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const m = await ProjectModel.findMembership(t.project_id, user.id);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const p = await ProjectModel.findById(t.project_id);
    (0, project_service_1.assertProjectOpen)(p);
    if (!t.assignee_id)
        (0, http_error_1.fail)(400, 'Cette tâche n’a pas de responsable');
    const manage = ProjectModel.canManageRole(m.role);
    if (!(manage || t.created_by === user.id))
        (0, http_error_1.fail)(403, 'Relance réservée au créateur ou au responsable du projet');
    const assignee = await UserModel.findById(t.assignee_id);
    if (!assignee || !assignee.email)
        (0, http_error_1.fail)(400, 'Pas d’email pour ce responsable');
    const rows = [['Projet', p.name], ['Tâche', t.title], ['Responsable', assignee.name], t.due ? ['Échéance', t.due] : null, ['Priorité', 'P' + (t.priority || 6)]];
    await (0, mail_service_1.sendMail)(assignee.email, `Relance : « ${t.title} »`, {
        intro: `${user.name} vous relance pour la tâche « ${t.title} » dans le projet « ${p.name} ».`,
        rows,
        ctaText: 'Ouvrir Planii',
        ctaUrl: env_1.env.webUrl,
    });
    await (0, notification_service_1.notify)(assignee.id, 'task_reminder', `Relance : ${t.title}`, `${user.name} vous a relancé.`);
    await (0, notification_service_1.logActivity)(t.project_id, user.id, 'task_reminded', `a relancé « ${t.title} »`);
    await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, user.id, 'task_reminded', { assigneeId: assignee.id });
}
async function deleteTask(taskId, userId) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const m = await ProjectModel.findMembership(t.project_id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const p = await ProjectModel.findById(t.project_id);
    (0, project_service_1.assertProjectOpen)(p);
    if (t.created_by !== userId && !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Suppression réservée au créateur ou au propriétaire');
    await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, userId, 'task_deleted', { title: t.title });
    await (0, pool_1.q)('DELETE FROM tasks WHERE id=$1 OR parent_id=$1', [t.id]);
    (0, notification_service_1.bump)(t.project_id);
}
async function listComments(taskId, userId) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const m = await ProjectModel.findMembership(t.project_id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const rows = await (0, pool_1.many)(`SELECT c.*, u.name AS user_name
    FROM task_comments c JOIN users u ON u.id=c.user_id
    WHERE c.task_id=$1 ORDER BY c.created_at ASC`, [t.id]);
    const manage = ProjectModel.canManageRole(m.role);
    return rows.map((c) => TaskView.comment({ ...c, canDelete: !c.deleted_at && (manage || c.user_id === userId) }));
}
async function addComment(taskId, user, body) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const m = await ProjectModel.findMembership(t.project_id, user.id);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const p = await ProjectModel.findById(t.project_id);
    (0, project_service_1.assertProjectOpen)(p);
    const text = String(body || '').trim().slice(0, 2000);
    if (!text)
        (0, http_error_1.fail)(400, 'Commentaire vide');
    const id = (0, utils_1.uid)();
    await (0, pool_1.q)('INSERT INTO task_comments (id,task_id,project_id,user_id,body) VALUES ($1,$2,$3,$4,$5)', [id, t.id, t.project_id, user.id, text]);
    await (0, notification_service_1.recordTaskEvent)(t.id, t.project_id, user.id, 'comment_added', { commentId: id });
    const targets = [...new Set([t.assignee_id, t.created_by].filter(Boolean).filter((x) => x !== user.id))];
    for (const targetId of targets)
        await (0, notification_service_1.notify)(targetId, 'task_comment', `Commentaire : ${t.title}`, `${user.name} a commenté une tâche.`);
    await (0, notification_service_1.notifyProject)(t.project_id, { type: 'project', projectId: t.project_id });
    return { id, taskId: t.id, projectId: t.project_id, userId: user.id, userName: user.name, body: text, deleted: false, canDelete: true, at: new Date().toISOString() };
}
async function deleteComment(commentId, userId) {
    const c = await (0, pool_1.one)('SELECT * FROM task_comments WHERE id=$1', [commentId]);
    if (!c)
        (0, http_error_1.fail)(404, 'Commentaire introuvable');
    const m = await ProjectModel.findMembership(c.project_id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    if (c.deleted_at)
        return;
    if (c.user_id !== userId && !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Suppression réservée à l’auteur ou au chef du projet');
    const p = await ProjectModel.findById(c.project_id);
    (0, project_service_1.assertProjectOpen)(p);
    await (0, pool_1.q)('UPDATE task_comments SET deleted_at=now() WHERE id=$1', [c.id]);
    await (0, notification_service_1.recordTaskEvent)(c.task_id, c.project_id, userId, 'comment_deleted', { commentId: c.id });
    await (0, notification_service_1.notifyProject)(c.project_id, { type: 'project', projectId: c.project_id });
}
async function listEvents(taskId, userId) {
    const t = await TaskModel.findById(taskId);
    if (!t)
        (0, http_error_1.fail)(404, 'Tâche introuvable');
    const m = await ProjectModel.findMembership(t.project_id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const rows = await (0, pool_1.many)(`SELECT e.*, u.name AS actor_name
    FROM task_events e LEFT JOIN users u ON u.id=e.actor_id
    WHERE e.task_id=$1 ORDER BY e.created_at ASC`, [t.id]);
    return rows.map((e) => TaskView.event({ ...e, payload: e.payload || {} }));
}
async function listMyTasks(userId) {
    const taskRows = await (0, pool_1.many)(`WITH mine AS (
      SELECT t.id FROM tasks t
      JOIN memberships m ON m.project_id = t.project_id AND m.user_id = $1
      WHERE t.assignee_id = $1
    )
    SELECT t.*, p.id AS project_id, p.name AS project_name, p.type AS project_type, p.status AS project_status,
      p.owner_id AS project_owner_id, p.deadline AS project_deadline, m.role AS my_role
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN memberships m ON m.project_id = p.id AND m.user_id = $1
    WHERE t.id IN (SELECT id FROM mine) OR t.parent_id IN (SELECT id FROM mine)
    ORDER BY t.priority ASC, t.created_at ASC`, [userId]);
    const projectIds = [...new Set(taskRows.map((r) => r.project_id))];
    const projects = [];
    for (const pid of projectIds) {
        const sample = taskRows.find((r) => r.project_id === pid);
        const members = (await (0, pool_1.many)(`SELECT m.user_id AS id, m.role, u.name, u.email, u.job
        FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY m.joined_at`, [pid])).map((m) => ({ id: m.id, role: m.role, name: m.name, email: m.email, job: m.job || '' }));
        const projectTasks = taskRows.filter((r) => r.project_id === pid).map((t) => TaskView.fromRow(t));
        projects.push({
            id: pid,
            name: sample.project_name,
            type: sample.project_type,
            status: sample.project_status,
            owner_id: sample.project_owner_id,
            deadline: sample.project_deadline,
            my_role: sample.my_role,
            members,
            tasks: projectTasks,
            polls: [],
            activity: [],
            roles: [],
            statuses: [],
            taskCount: projectTasks.length,
            doneCount: projectTasks.filter((t) => t.done).length,
        });
    }
    return projects;
}
//# sourceMappingURL=task.service.js.map