"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canManageRole = exports.canReopen = exports.reopenUntil = exports.isClosed = exports.findMembers = exports.findMembership = exports.findById = void 0;
const pool_1 = require("../db/pool");
const constants_1 = require("../lib/constants");
const findById = (id) => (0, pool_1.one)('SELECT * FROM projects WHERE id=$1', [id]);
exports.findById = findById;
const findMembership = (projectId, userId) => (0, pool_1.one)('SELECT * FROM memberships WHERE project_id=$1 AND user_id=$2', [projectId, userId]);
exports.findMembership = findMembership;
const findMembers = (projectId) => (0, pool_1.many)('SELECT user_id, role FROM memberships WHERE project_id=$1', [projectId]);
exports.findMembers = findMembers;
const isClosed = (p) => !!p && p.status === 'done';
exports.isClosed = isClosed;
const reopenUntil = (p) => p?.done_at ? new Date(new Date(p.done_at).getTime() + constants_1.REOPEN_DAYS * 864e5) : null;
exports.reopenUntil = reopenUntil;
const canReopen = (p) => {
    const until = (0, exports.reopenUntil)(p);
    return (0, exports.isClosed)(p) && !!until && until >= new Date();
};
exports.canReopen = canReopen;
const canManageRole = (role) => role === 'owner' || role === 'lead';
exports.canManageRole = canManageRole;
//# sourceMappingURL=Project.model.js.map