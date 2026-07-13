"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityItem = exports.paginatedTasks = exports.activityPaginated = exports.activity = exports.memberRoles = exports.statuses = exports.roleCreated = exports.single = exports.detail = exports.created = exports.listItem = void 0;
const listItem = (row) => ({
    ...row,
    my_role: row.my_role,
    memberCount: row.memberCount,
    taskCount: row.taskCount,
    doneCount: row.doneCount,
});
exports.listItem = listItem;
const created = (p, role) => ({
    project: { ...p, my_role: role, memberCount: 1, taskCount: 0, doneCount: 0 },
});
exports.created = created;
const detail = (project, myRole) => ({
    project: { ...project, my_role: myRole },
});
exports.detail = detail;
const single = (p) => ({ project: p });
exports.single = single;
const roleCreated = (id, name) => ({ role: { id, name } });
exports.roleCreated = roleCreated;
const statuses = (items) => ({ statuses: items });
exports.statuses = statuses;
const memberRoles = (ids) => ({ ok: true, roleIds: ids });
exports.memberRoles = memberRoles;
const activity = (items) => ({ activity: items });
exports.activity = activity;
const activityPaginated = (result) => ({
    ...result,
    activity: result.items,
});
exports.activityPaginated = activityPaginated;
const paginatedTasks = (result) => result;
exports.paginatedTasks = paginatedTasks;
const activityItem = (a) => ({
    id: a.id,
    type: a.type,
    detail: a.detail,
    user: a.user_name,
    at: a.created_at,
});
exports.activityItem = activityItem;
//# sourceMappingURL=Project.view.js.map