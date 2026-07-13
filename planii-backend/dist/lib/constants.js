"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REOPEN_DAYS = exports.CREATOR_ROLE = exports.DEFAULT_CUSTOM_TASK_STATUSES = exports.FIXED_TASK_STATUSES = exports.DEFAULT_PROJECT_LABELS = exports.PROJECT_LABEL_COLORS = exports.DEFAULT_TASK_TYPES = void 0;
exports.DEFAULT_TASK_TYPES = ['Tâche', 'Bug'];
exports.PROJECT_LABEL_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
exports.DEFAULT_PROJECT_LABELS = [
    { label: 'Travail', color: '#3b82f6', position: 0, fixed: true },
    { label: 'Privé', color: '#ef4444', position: 1, fixed: true },
];
exports.FIXED_TASK_STATUSES = [
    { key: 'todo', label: 'À faire', color: '#9a988f', position: 0, fixed: true },
    { key: 'in_progress', label: 'En cours', color: '#3b82d6', position: 1, fixed: true },
    { key: 'review', label: 'Revu', color: '#9b5de5', position: 2, fixed: true },
    { key: 'done', label: 'Terminé', color: '#4caf50', position: 99, fixed: true },
];
exports.DEFAULT_CUSTOM_TASK_STATUSES = [
    { key: 'transferred', label: 'Transféré', color: '#f59f30', position: 3, fixed: false },
];
exports.CREATOR_ROLE = { solo: 'owner', team: 'lead', group: 'owner' };
exports.REOPEN_DAYS = 30;
//# sourceMappingURL=constants.js.map