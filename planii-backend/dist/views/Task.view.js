"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mine = exports.events = exports.event = exports.comments = exports.commentCreated = exports.comment = exports.meetingCreated = exports.fromRow = exports.created = void 0;
const created = (task) => ({ task });
exports.created = created;
const fromRow = (t) => ({
    id: t.id,
    title: t.title,
    description: t.description || null,
    type: t.type || null,
    assigneeId: t.assignee_id,
    createdBy: t.created_by,
    due: t.due,
    done: t.done,
    doneAt: t.done_at,
    estHours: t.est_hours == null ? null : Number(t.est_hours),
    spentHours: t.spent_hours == null ? null : Number(t.spent_hours),
    priority: t.priority == null ? 6 : Number(t.priority),
    parentId: t.parent_id || null,
    position: t.position == null ? null : Number(t.position),
    statusKey: t.status_key || (t.done ? 'done' : 'todo'),
    transferable: t.transferable === true,
    transferredFrom: t.transferred_from || null,
    transferredTo: t.transferred_to || null,
    transferHistory: t.transferHistory || [],
    commentCount: t.commentCount || 0,
});
exports.fromRow = fromRow;
const meetingCreated = (task) => ({ task });
exports.meetingCreated = meetingCreated;
const comment = (c) => ({
    id: c.id,
    taskId: c.task_id,
    projectId: c.project_id,
    userId: c.user_id,
    userName: c.user_name,
    body: c.deleted_at ? '[commentaire supprimé]' : c.body,
    deleted: !!c.deleted_at,
    canDelete: c.canDelete,
    at: c.created_at,
});
exports.comment = comment;
const commentCreated = (c) => ({ comment: c });
exports.commentCreated = commentCreated;
const comments = (items) => ({ comments: items });
exports.comments = comments;
const event = (e) => ({
    id: e.id,
    taskId: e.task_id,
    projectId: e.project_id,
    actorId: e.actor_id || null,
    actorName: e.actor_name || 'Planii',
    type: e.type,
    payload: e.payload || {},
    at: e.created_at,
});
exports.event = event;
const events = (items) => ({ events: items });
exports.events = events;
const mine = (projects) => ({ projects });
exports.mine = mine;
//# sourceMappingURL=Task.view.js.map