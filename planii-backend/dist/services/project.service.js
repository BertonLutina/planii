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
exports.assertProjectOpen = assertProjectOpen;
exports.ensureProjectStatuses = ensureProjectStatuses;
exports.ensureProjectLabels = ensureProjectLabels;
exports.defaultProjectLabelId = defaultProjectLabelId;
exports.listProjectTasks = listProjectTasks;
exports.projectDetail = projectDetail;
exports.deleteProjectCascade = deleteProjectCascade;
exports.sendTaskAssignmentMails = sendTaskAssignmentMails;
exports.createProject = createProject;
exports.listProjects = listProjects;
exports.reorderProjects = reorderProjects;
exports.getProject = getProject;
exports.closeProject = closeProject;
exports.reopenProject = reopenProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
exports.createRole = createRole;
exports.deleteRole = deleteRole;
exports.setMemberRoles = setMemberRoles;
exports.createTaskStatus = createTaskStatus;
exports.deleteTaskStatus = deleteTaskStatus;
const pool_1 = require("../db/pool");
const env_1 = require("../config/env");
const utils_1 = require("../lib/utils");
const constants_1 = require("../lib/constants");
const http_error_1 = require("../core/http-error");
const pagination_1 = require("../lib/pagination");
const ProjectModel = __importStar(require("../models/Project.model"));
const UserModel = __importStar(require("../models/User.model"));
const TaskView = __importStar(require("../views/Task.view"));
const mail_service_1 = require("./mail.service");
const notification_service_1 = require("./notification.service");
function assertProjectOpen(p) {
    if (ProjectModel.isClosed(p))
        (0, http_error_1.fail)(423, 'Projet clôturé : seule la réouverture ou la suppression est autorisée');
}
async function ensureProjectStatuses(projectId) {
    const existing = await (0, pool_1.many)('SELECT key, fixed FROM task_statuses WHERE project_id=$1', [projectId]);
    const keys = new Set(existing.map((s) => s.key));
    for (const st of constants_1.FIXED_TASK_STATUSES) {
        if (!keys.has(st.key)) {
            await (0, pool_1.q)('INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (project_id,key) DO NOTHING', [(0, utils_1.uid)(), projectId, st.key, st.label, st.color, st.position, st.fixed]);
        }
    }
    if (existing.length === 0) {
        for (const st of constants_1.DEFAULT_CUSTOM_TASK_STATUSES) {
            await (0, pool_1.q)('INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (project_id,key) DO NOTHING', [(0, utils_1.uid)(), projectId, st.key, st.label, st.color, st.position, st.fixed]);
        }
    }
    return (0, pool_1.many)('SELECT id,key,label,color,position,fixed FROM task_statuses WHERE project_id=$1 ORDER BY position ASC, label ASC', [projectId]);
}
async function ensureProjectLabels(userId) {
    const existing = await (0, pool_1.many)('SELECT id,label,color,position,fixed FROM project_labels WHERE user_id=$1 ORDER BY position ASC, label ASC', [userId]);
    for (const d of constants_1.DEFAULT_PROJECT_LABELS) {
        if (!existing.some((x) => String(x.label).toLowerCase() === d.label.toLowerCase())) {
            await (0, pool_1.q)('INSERT INTO project_labels (id,user_id,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6)', [(0, utils_1.uid)(), userId, d.label, d.color, d.position, d.fixed]);
        }
    }
    return (0, pool_1.many)('SELECT id,label,color,position,fixed FROM project_labels WHERE user_id=$1 ORDER BY position ASC, label ASC', [userId]);
}
async function defaultProjectLabelId(userId) {
    const labels = await ensureProjectLabels(userId);
    return (labels.find((l) => String(l.label).toLowerCase() === 'travail') || labels[0]).id;
}
async function enrichTasks(projectId, rows) {
    if (!rows.length)
        return [];
    const taskIds = rows.map((t) => t.id);
    const transferRows = await (0, pool_1.many)(`SELECT tr.*, fu.name AS from_name, tu.name AS to_name, cu.name AS created_by_name
      FROM task_transfers tr
      LEFT JOIN users fu ON fu.id=tr.from_user_id
      JOIN users tu ON tu.id=tr.to_user_id
      JOIN users cu ON cu.id=tr.created_by
      WHERE tr.project_id=$1 AND tr.task_id = ANY($2::text[])
      ORDER BY tr.created_at ASC`, [projectId, taskIds]);
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
    const commentRows = await (0, pool_1.many)(`SELECT task_id, count(*)::int AS c
      FROM task_comments WHERE project_id=$1 AND deleted_at IS NULL AND task_id = ANY($2::text[])
      GROUP BY task_id`, [projectId, taskIds]);
    const commentCountByTask = Object.fromEntries(commentRows.map((r) => [r.task_id, Number(r.c) || 0]));
    return rows.map((t) => TaskView.fromRow({
        ...t,
        transferHistory: transfersByTask[t.id] || [],
        commentCount: commentCountByTask[t.id] || 0,
    }));
}
async function listProjectTasks(projectId, userId, query) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Vous n’êtes pas membre de ce projet');
    const { page, limit, offset } = (0, pagination_1.parsePagination)(query);
    const filters = ['t.project_id=$1'];
    const vals = [p.id];
    const add = (v) => { vals.push(v); return `$${vals.length}`; };
    if (query.statusKey) {
        filters.push(`t.status_key=${add(String(query.statusKey))}`);
    }
    if (query.assigneeId) {
        filters.push(`t.assignee_id=${add(String(query.assigneeId))}`);
    }
    if (query.done === 'true')
        filters.push('t.done=true');
    if (query.done === 'false')
        filters.push('t.done=false');
    if (query.parentId === 'null' || query.roots === 'true')
        filters.push('t.parent_id IS NULL');
    const where = filters.join(' AND ');
    const countRow = await (0, pool_1.one)(`SELECT count(*)::int AS c FROM tasks t WHERE ${where}`, vals);
    const total = Number(countRow.c) || 0;
    const rows = await (0, pool_1.many)(`SELECT t.* FROM tasks t WHERE ${where}
      ORDER BY t.priority ASC, t.created_at ASC
      LIMIT ${limit} OFFSET ${offset}`, vals);
    const items = await enrichTasks(p.id, rows);
    return (0, pagination_1.paginated)(items, total, page, limit);
}
async function projectDetail(p, userId, opts = {}) {
    const statuses = await ensureProjectStatuses(p.id);
    const defaults = await ensureProjectLabels(p.owner_id);
    const fallbackLabel = defaults.find((l) => String(l.label).toLowerCase() === 'travail') || defaults[0];
    const projectLabel = p.label_id
        ? await (0, pool_1.one)('SELECT id,label,color FROM project_labels WHERE id=$1', [p.label_id])
        : null;
    const roles = await (0, pool_1.many)('SELECT id, name FROM project_roles WHERE project_id=$1 ORDER BY created_at ASC', [p.id]);
    const mroles = await (0, pool_1.many)('SELECT user_id, role_id FROM member_roles WHERE project_id=$1', [p.id]);
    const rolesByMember = {};
    for (const r of mroles)
        (rolesByMember[r.user_id] = rolesByMember[r.user_id] || []).push(r.role_id);
    const members = (await (0, pool_1.many)(`SELECT m.user_id AS id, m.role, u.name, u.email, u.job
      FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.project_id=$1 ORDER BY m.joined_at`, [p.id]))
        .map((m) => ({ id: m.id, role: m.role, name: m.name, email: m.email, job: m.job || '', roleIds: rolesByMember[m.id] || [] }));
    const counts = await (0, pool_1.one)(`SELECT count(*)::int AS total, count(*) FILTER (WHERE done)::int AS done,
      coalesce(sum(
        CASE
          WHEN NOT done THEN 0
          WHEN due IS NULL THEN 10
          WHEN done_at::date < due THEN 20
          WHEN done_at::date = due THEN 15
          ELSE 5
        END
      ), 0)::int AS points
      FROM tasks WHERE project_id=$1`, [p.id]);
    let tasks = [];
    if (opts.includeTasks) {
        const taskRows = await (0, pool_1.many)('SELECT * FROM tasks WHERE project_id=$1 ORDER BY priority ASC, created_at ASC', [p.id]);
        tasks = await enrichTasks(p.id, taskRows);
    }
    const pollRows = await (0, pool_1.many)('SELECT * FROM polls WHERE project_id=$1 ORDER BY created_at DESC', [p.id]);
    const polls = [];
    for (const pl of pollRows) {
        const pollOpts = await (0, pool_1.many)('SELECT * FROM poll_options WHERE poll_id=$1', [pl.id]);
        const votes = await (0, pool_1.many)('SELECT * FROM poll_votes WHERE poll_id=$1', [pl.id]);
        polls.push({
            id: pl.id,
            question: pl.question,
            closed: pl.closed,
            createdBy: pl.created_by,
            options: pollOpts.map((o) => ({ id: o.id, label: o.label, votes: votes.filter((v) => v.option_id === o.id).length })),
            myVote: (votes.find((v) => v.user_id === userId) || {}).option_id || null,
        });
    }
    const activity = [];
    return {
        ...p,
        closedAt: p.done_at || null,
        reopenUntil: ProjectModel.reopenUntil(p)?.toISOString() || null,
        canReopen: ProjectModel.canReopen(p),
        labelId: (projectLabel && projectLabel.id) || fallbackLabel.id,
        labelName: (projectLabel && projectLabel.label) || fallbackLabel.label,
        labelColor: (projectLabel && projectLabel.color) || fallbackLabel.color,
        roles,
        statuses,
        members,
        tasks,
        taskCount: Number(counts.total) || 0,
        doneCount: Number(counts.done) || 0,
        totalPoints: Number(counts.points) || 0,
        polls,
        activity,
    };
}
async function deleteProjectCascade(client, projectId) {
    await client.query('DELETE FROM poll_votes WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [projectId]);
    await client.query('DELETE FROM poll_options WHERE poll_id IN (SELECT id FROM polls WHERE project_id=$1)', [projectId]);
    await client.query('DELETE FROM polls WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM task_transfers WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM project_meeting_task_delegates WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM meeting_messages WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM tasks WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM invites WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM activity WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM member_roles WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM project_roles WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM memberships WHERE project_id=$1', [projectId]);
    await client.query('DELETE FROM projects WHERE id=$1', [projectId]);
}
async function sendTaskAssignmentMails({ project, task, actor, assigneeId, source = 'project', }) {
    if (!assigneeId)
        return;
    const assignee = await UserModel.findById(assigneeId);
    if (!assignee)
        return;
    const rows = [
        ['Projet', project.name],
        ['Tâche', task.title],
        ['Responsable', assignee.name],
        task.priority ? ['Priorité', 'P' + task.priority] : null,
        task.due ? ['Échéance', task.due] : null,
        source === 'meeting' ? ['Origine', 'Meeting'] : null,
    ];
    if (assignee.email && assignee.id !== actor.id) {
        await (0, mail_service_1.sendMail)(assignee.email, `Tâche attribuée : ${task.title}`, {
            intro: `La tâche « ${task.title} » vous a été attribuée dans le projet « ${project.name} ».`,
            rows,
            ctaText: 'Ouvrir Planii',
            ctaUrl: env_1.env.webUrl,
        });
        await (0, notification_service_1.notify)(assignee.id, 'task_assigned', `Tâche attribuée : ${task.title}`, `Projet « ${project.name} »`);
    }
    for (const manager of await UserModel.projectManagers(project.id)) {
        if (!manager.email || manager.id === assignee.id)
            continue;
        await (0, mail_service_1.sendMail)(manager.email, `Tâche attribuée dans « ${project.name} »`, {
            intro: `${actor.name} a attribué la tâche « ${task.title} » à ${assignee.name}.`,
            rows,
            ctaText: 'Ouvrir Planii',
            ctaUrl: env_1.env.webUrl,
        });
    }
}
async function createProject(userId, body) {
    const name = (body.name || '').trim();
    const type = body.type;
    if (!name)
        (0, http_error_1.fail)(400, 'Nom du projet requis');
    if (!['solo', 'team', 'group'].includes(type || ''))
        (0, http_error_1.fail)(400, 'Type invalide');
    const labels = await ensureProjectLabels(userId);
    const requestedLabel = labels.find((l) => l.id === body.labelId);
    const labelId = requestedLabel ? requestedLabel.id : await defaultProjectLabelId(userId);
    const id = (0, utils_1.uid)();
    const role = constants_1.CREATOR_ROLE[type];
    await (0, pool_1.q)('INSERT INTO projects (id,name,type,owner_id,deadline,label_id) VALUES ($1,$2,$3,$4,$5,$6)', [id, name, type, userId, body.deadline || null, labelId]);
    await (0, pool_1.q)('INSERT INTO memberships (id,project_id,user_id,role) VALUES ($1,$2,$3,$4)', [(0, utils_1.uid)(), id, userId, role]);
    await ensureProjectStatuses(id);
    await (0, notification_service_1.logActivity)(id, userId, 'project_created', `a créé le projet « ${name} »`);
    const p = await ProjectModel.findById(id);
    return { project: p, role };
}
async function listProjects(userId, query = {}) {
    const defaults = await ensureProjectLabels(userId);
    const fallback = defaults.find((l) => String(l.label).toLowerCase() === 'travail') || defaults[0];
    const baseFrom = `FROM projects p JOIN memberships m ON m.project_id=p.id
    LEFT JOIN project_labels pl ON pl.id=p.label_id
    WHERE m.user_id=$1`;
    const countsRow = await (0, pool_1.one)(`SELECT count(*) FILTER (WHERE p.status <> 'done')::int AS active,
      count(*) FILTER (WHERE p.status = 'done')::int AS done
    ${baseFrom}`, [userId]);
    const paginate = query.page != null || query.limit != null;
    const status = String(query.status || 'all');
    const filters = [baseFrom];
    const vals = [userId];
    if (status === 'active')
        filters.push(`AND p.status <> 'done'`);
    if (status === 'done')
        filters.push(`AND p.status = 'done'`);
    const where = filters.join(' ');
    const select = `SELECT p.*, m.role AS my_role, m.position AS position,
      pl.id AS "labelId", pl.label AS "labelName", pl.color AS "labelColor",
      (SELECT count(*) FROM memberships mm WHERE mm.project_id=p.id)::int AS "memberCount",
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id)::int AS "taskCount",
      (SELECT count(*) FROM tasks t WHERE t.project_id=p.id AND t.done)::int AS "doneCount",
      (SELECT coalesce(sum(
        CASE
          WHEN NOT t.done THEN 0
          WHEN t.due IS NULL THEN 10
          WHEN t.done_at::date < t.due THEN 20
          WHEN t.done_at::date = t.due THEN 15
          ELSE 5
        END
      ), 0)::int FROM tasks t WHERE t.project_id=p.id) AS "totalPoints"
    ${where}
    ORDER BY m.position ASC NULLS LAST, p.name ASC`;
    if (!paginate) {
        const rows = await (0, pool_1.many)(select, vals);
        for (const row of rows) {
            if (!row.labelId) {
                row.labelId = fallback.id;
                row.labelName = fallback.label;
                row.labelColor = fallback.color;
            }
        }
        return rows;
    }
    const { page, limit, offset } = (0, pagination_1.parsePagination)(query, { limit: 24 });
    const countRow = await (0, pool_1.one)(`SELECT count(*)::int AS c ${where}`, vals);
    const total = Number(countRow.c) || 0;
    const rows = await (0, pool_1.many)(`${select} LIMIT ${limit} OFFSET ${offset}`, vals);
    for (const row of rows) {
        if (!row.labelId) {
            row.labelId = fallback.id;
            row.labelName = fallback.label;
            row.labelColor = fallback.color;
        }
    }
    return {
        ...(0, pagination_1.paginated)(rows, total, page, limit),
        counts: { active: Number(countsRow.active) || 0, done: Number(countsRow.done) || 0 },
    };
}
async function reorderProjects(userId, ids) {
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < ids.length; i++)
            await client.query('UPDATE memberships SET position=$1 WHERE user_id=$2 AND project_id=$3', [i, userId, ids[i]]);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
async function getProject(projectId, userId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Vous n’êtes pas membre de ce projet');
    return { project: await projectDetail(p, userId), myRole: m.role };
}
async function closeProject(projectId, userId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au propriétaire ou leader');
    if (ProjectModel.isClosed(p))
        return;
    await (0, pool_1.q)(`UPDATE projects SET status='done', done_at=now() WHERE id=$1`, [p.id]);
    await (0, notification_service_1.logActivity)(p.id, userId, 'project_closed', 'a clôturé le projet');
}
async function reopenProject(projectId, userId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    if (p.owner_id !== userId)
        (0, http_error_1.fail)(403, 'Seul le propriétaire peut réouvrir le projet');
    if (!ProjectModel.isClosed(p))
        return;
    if (!ProjectModel.canReopen(p))
        (0, http_error_1.fail)(410, 'Le délai de réouverture de 30 jours est dépassé');
    await (0, pool_1.q)(`UPDATE projects SET status='active', done_at=NULL WHERE id=$1`, [p.id]);
    await (0, notification_service_1.logActivity)(p.id, userId, 'project_reopened', 'a réouvert le projet');
    await (0, notification_service_1.notifyProject)(p.id, { type: 'project', projectId: p.id });
}
async function updateProject(projectId, userId, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    if (p.owner_id !== userId)
        (0, http_error_1.fail)(403, 'Seul le propriétaire peut modifier le projet');
    assertProjectOpen(p);
    const sets = [];
    const vals = [];
    if (typeof body.name === 'string') {
        const name = body.name.trim();
        if (!name)
            (0, http_error_1.fail)(400, 'Le nom ne peut pas être vide');
        sets.push(`name=$${sets.length + 1}`);
        vals.push(name);
    }
    if ('deadline' in body) {
        sets.push(`deadline=$${sets.length + 1}`);
        vals.push(body.deadline || null);
    }
    if ('labelId' in body) {
        const labels = await ensureProjectLabels(userId);
        const nextLabel = labels.find((l) => l.id === body.labelId) || labels.find((l) => String(l.label).toLowerCase() === 'travail') || labels[0];
        sets.push(`label_id=$${sets.length + 1}`);
        vals.push(nextLabel.id);
    }
    if (!sets.length)
        (0, http_error_1.fail)(400, 'Rien à modifier');
    vals.push(p.id);
    await (0, pool_1.q)(`UPDATE projects SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
    await (0, notification_service_1.logActivity)(p.id, userId, 'project_updated', 'a modifié le projet');
    for (const mb of await ProjectModel.findMembers(p.id)) {
        if (mb.user_id !== userId)
            await (0, notification_service_1.notify)(mb.user_id, 'project_updated', 'Projet modifié', `Le projet « ${body.name ? String(body.name).trim() : p.name} » a été mis à jour.`);
    }
    return ProjectModel.findById(p.id);
}
async function deleteProject(projectId, userId, userName) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    if (p.owner_id !== userId)
        (0, http_error_1.fail)(403, 'Seul le propriétaire peut supprimer le projet');
    const members = await ProjectModel.findMembers(p.id);
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        for (const mb of members) {
            if (mb.user_id === userId)
                continue;
            await client.query('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)', [(0, utils_1.uid)(), mb.user_id, 'project_deleted', 'Projet supprimé', `Le projet « ${p.name} » a été supprimé par ${userName}. Vous n'en êtes plus membre.`]);
        }
        await deleteProjectCascade(client, p.id);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
    return members.length - 1;
}
async function createRole(projectId, userId, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au propriétaire ou leader');
    assertProjectOpen(p);
    const name = (body.name || '').trim().slice(0, 40);
    if (!name)
        (0, http_error_1.fail)(400, 'Nom du rôle requis');
    const existing = await (0, pool_1.many)('SELECT id FROM project_roles WHERE project_id=$1', [p.id]);
    if (existing.length >= 30)
        (0, http_error_1.fail)(400, 'Trop de rôles (max 30)');
    const dup = await (0, pool_1.one)('SELECT id FROM project_roles WHERE project_id=$1 AND lower(name)=lower($2)', [p.id, name]);
    if (dup)
        (0, http_error_1.fail)(409, 'Ce rôle existe déjà');
    const id = (0, utils_1.uid)();
    await (0, pool_1.q)('INSERT INTO project_roles (id,project_id,name) VALUES ($1,$2,$3)', [id, p.id, name]);
    await (0, notification_service_1.logActivity)(p.id, userId, 'role_created', `a créé le rôle « ${name} »`);
    return { id, name };
}
async function deleteRole(projectId, userId, roleId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au propriétaire ou leader');
    assertProjectOpen(p);
    const role = await (0, pool_1.one)('SELECT * FROM project_roles WHERE id=$1 AND project_id=$2', [roleId, p.id]);
    if (!role)
        (0, http_error_1.fail)(404, 'Rôle introuvable');
    await (0, pool_1.q)('DELETE FROM member_roles WHERE project_id=$1 AND role_id=$2', [p.id, role.id]);
    await (0, pool_1.q)('DELETE FROM project_roles WHERE id=$1', [role.id]);
    (0, notification_service_1.bump)(p.id);
}
async function setMemberRoles(projectId, userId, targetUserId, roleIds) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au propriétaire ou leader');
    assertProjectOpen(p);
    const target = await ProjectModel.findMembership(p.id, targetUserId);
    if (!target)
        (0, http_error_1.fail)(400, 'Ce membre ne fait pas partie du projet');
    const wanted = Array.isArray(roleIds) ? roleIds : [];
    const valid = await (0, pool_1.many)('SELECT id FROM project_roles WHERE project_id=$1', [p.id]);
    const validIds = new Set(valid.map((row) => row.id));
    const ids = [...new Set(wanted.filter((rid) => validIds.has(rid)))];
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM member_roles WHERE project_id=$1 AND user_id=$2', [p.id, target.user_id]);
        for (const rid of ids)
            await client.query('INSERT INTO member_roles (project_id,user_id,role_id) VALUES ($1,$2,$3)', [p.id, target.user_id, rid]);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
    await (0, notification_service_1.logActivity)(p.id, userId, 'roles_assigned', 'a mis à jour les rôles d’un membre');
    return ids;
}
async function createTaskStatus(projectId, userId, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au propriétaire ou leader');
    assertProjectOpen(p);
    const label = (body.label || '').trim().slice(0, 32);
    if (!label)
        (0, http_error_1.fail)(400, 'Nom du statut requis');
    const count = await (0, pool_1.one)('SELECT count(*)::int AS c FROM task_statuses WHERE project_id=$1', [p.id]);
    if (Number(count.c) >= 12)
        (0, http_error_1.fail)(400, 'Trop de statuts (max 12)');
    const key = (0, utils_1.slugStatus)(label);
    const dup = await (0, pool_1.one)('SELECT 1 FROM task_statuses WHERE project_id=$1 AND (key=$2 OR lower(label)=lower($3))', [p.id, key, label]);
    if (dup)
        (0, http_error_1.fail)(409, 'Ce statut existe déjà');
    const maxPos = await (0, pool_1.one)('SELECT coalesce(max(position),0)::int AS p FROM task_statuses WHERE project_id=$1 AND key <> $2', [p.id, 'done']);
    const color = (body.color || '#9a988f').trim().slice(0, 24);
    await (0, pool_1.q)('INSERT INTO task_statuses (id,project_id,key,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,$6,false)', [(0, utils_1.uid)(), p.id, key, label, color, Number(maxPos.p) + 1]);
    await (0, notification_service_1.logActivity)(p.id, userId, 'task_status_created', `a créé le statut « ${label} »`);
    return ensureProjectStatuses(p.id);
}
async function deleteTaskStatus(projectId, userId, statusKey) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m || !ProjectModel.canManageRole(m.role))
        (0, http_error_1.fail)(403, 'Réservé au propriétaire ou leader');
    assertProjectOpen(p);
    const st = await (0, pool_1.one)('SELECT * FROM task_statuses WHERE project_id=$1 AND key=$2', [p.id, statusKey]);
    if (!st)
        (0, http_error_1.fail)(404, 'Statut introuvable');
    if (st.fixed)
        (0, http_error_1.fail)(400, 'Ce statut fixe ne peut pas être supprimé');
    await (0, pool_1.q)('UPDATE tasks SET status_key=$1, done=false, done_at=NULL, transferred_from=NULL, transferred_to=NULL WHERE project_id=$2 AND status_key=$3', ['todo', p.id, st.key]);
    await (0, pool_1.q)('DELETE FROM task_statuses WHERE project_id=$1 AND key=$2', [p.id, st.key]);
    await (0, notification_service_1.logActivity)(p.id, userId, 'task_status_deleted', `a supprimé le statut « ${st.label} »`);
    return ensureProjectStatuses(p.id);
}
//# sourceMappingURL=project.service.js.map