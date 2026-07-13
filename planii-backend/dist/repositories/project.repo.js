"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canManage = exports.canReopenProject = exports.reopenUntil = exports.projectClosed = exports.projectMembers = exports.membership = exports.projectById = void 0;
exports.assertProjectOpen = assertProjectOpen;
const pool_1 = require("../db/pool");
const constants_1 = require("../lib/constants");
const projectById = (id) => (0, pool_1.one)('SELECT * FROM projects WHERE id=$1', [id]);
exports.projectById = projectById;
const membership = (pid, uid) => (0, pool_1.one)('SELECT * FROM memberships WHERE project_id=$1 AND user_id=$2', [pid, uid]);
exports.membership = membership;
const projectMembers = (pid) => (0, pool_1.many)('SELECT user_id, role FROM memberships WHERE project_id=$1', [pid]);
exports.projectMembers = projectMembers;
const projectClosed = (p) => p && p.status === 'done';
exports.projectClosed = projectClosed;
const reopenUntil = (p) => p && p.done_at ? new Date(new Date(p.done_at).getTime() + constants_1.REOPEN_DAYS * 864e5) : null;
exports.reopenUntil = reopenUntil;
const canReopenProject = (p) => {
    const until = (0, exports.reopenUntil)(p);
    return (0, exports.projectClosed)(p) && until && until >= new Date();
};
exports.canReopenProject = canReopenProject;
const canManage = (role) => role === 'owner' || role === 'lead';
exports.canManage = canManage;
function assertProjectOpen(p, res) {
    if (!(0, exports.projectClosed)(p))
        return false;
    res.status(423).json({ error: 'Projet clôturé : seule la réouverture ou la suppression est autorisée' });
    return true;
}
//# sourceMappingURL=project.repo.js.map