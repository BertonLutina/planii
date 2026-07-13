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
exports.adminProject = exports.paginated = exports.projects = exports.adminTask = exports.tasks = exports.mailMessage = exports.mailList = exports.auditLog = exports.userRow = exports.users = exports.stats = exports.maskEmail = exports.anonUser = exports.anonTask = exports.anonProject = exports.pointsForTask = void 0;
const UserView = __importStar(require("./User.view"));
const pointsForTask = (due, doneDay) => {
    if (!due)
        return 10;
    if (!doneDay)
        return 15;
    if (doneDay < due)
        return 20;
    if (doneDay === due)
        return 15;
    return 5;
};
exports.pointsForTask = pointsForTask;
const anonProject = (id) => `Projet #${String(id || '').slice(0, 6).toUpperCase()}`;
exports.anonProject = anonProject;
const anonTask = () => 'Tâche anonymisée';
exports.anonTask = anonTask;
const anonUser = (id) => `Utilisateur #${String(id || '').slice(0, 6).toUpperCase()}`;
exports.anonUser = anonUser;
const maskEmail = (email) => {
    const [name, domain] = String(email || '').split('@');
    if (!domain)
        return '[masqué]';
    return `${name.slice(0, 1)}***@${domain}`;
};
exports.maskEmail = maskEmail;
const stats = (data) => ({ stats: data });
exports.stats = stats;
const users = (items) => ({ users: items });
exports.users = users;
const userRow = (u, extra) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    firstName: u.first_name || '',
    lastName: u.last_name || '',
    createdAt: u.created_at,
    lastLogin: u.last_login,
    admin: UserView.isAdmin(u),
    superAdmin: UserView.isSuperAdmin(u),
    projectCount: extra.projectCount,
    tasksOpen: extra.tasksOpen,
    tasksDone: extra.tasksDone,
    points: extra.points,
});
exports.userRow = userRow;
const auditLog = (rows) => ({
    audit: rows.map((row) => ({
        id: row.id,
        actor: row.actor_name,
        action: row.action,
        detail: row.detail,
        at: row.created_at,
    })),
});
exports.auditLog = auditLog;
const mailList = (messages, mailbox) => ({ messages, mailbox });
exports.mailList = mailList;
const mailMessage = (message) => ({ message });
exports.mailMessage = mailMessage;
const tasks = (items) => ({ tasks: items });
exports.tasks = tasks;
const adminTask = (t) => ({
    id: t.id,
    title: (0, exports.anonTask)(),
    projectId: t.project_id,
    projectName: (0, exports.anonProject)(String(t.project_id)),
    assigneeName: t.assignee_id ? (0, exports.anonUser)(String(t.assignee_id)) : null,
    due: t.due,
    done: t.done,
    priority: t.priority == null ? 6 : Number(t.priority),
});
exports.adminTask = adminTask;
const projects = (items) => ({ projects: items });
exports.projects = projects;
const paginated = (result) => result;
exports.paginated = paginated;
const adminProject = (p) => ({
    id: p.id,
    name: (0, exports.anonProject)(String(p.id)),
    type: p.type,
    status: p.status,
    deadline: p.deadline,
    ownerName: p.owner_id ? (0, exports.anonUser)(String(p.owner_id)) : '—',
    ownerEmail: (0, exports.maskEmail)(String(p.owner_email || '')),
    memberCount: p.memberCount,
    taskCount: p.taskCount,
    doneCount: p.doneCount,
    createdAt: p.created_at,
});
exports.adminProject = adminProject;
//# sourceMappingURL=Admin.view.js.map