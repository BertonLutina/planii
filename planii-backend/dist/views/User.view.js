"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authSession = exports.signToken = exports.toPublic = exports.projectLabelColorsOf = exports.roleLibraryOf = exports.taskTypesOf = exports.isAdmin = exports.isSuperAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const constants_1 = require("../lib/constants");
const utils_1 = require("../lib/utils");
const isSuperAdmin = (u) => env_1.env.superAdminEmails.includes((u.email || '').toLowerCase());
exports.isSuperAdmin = isSuperAdmin;
const isAdmin = (u) => (0, exports.isSuperAdmin)(u) || u.is_admin === true;
exports.isAdmin = isAdmin;
const taskTypesOf = (u) => (u && Array.isArray(u.task_types) && u.task_types.length) ? u.task_types : constants_1.DEFAULT_TASK_TYPES;
exports.taskTypesOf = taskTypesOf;
const roleLibraryOf = (u) => (u && Array.isArray(u.role_library)) ? u.role_library : [];
exports.roleLibraryOf = roleLibraryOf;
const projectLabelColorsOf = (u) => {
    const custom = Array.isArray(u?.project_label_colors)
        ? u.project_label_colors.map((c) => (0, utils_1.cleanColor)(c, '')).filter(Boolean)
        : [];
    return (0, utils_1.cleanLabels)([...constants_1.PROJECT_LABEL_COLORS, ...custom], 7, 40);
};
exports.projectLabelColorsOf = projectLabelColorsOf;
const toPublic = (u) => u && {
    id: u.id,
    name: u.name,
    email: u.email,
    firstName: u.first_name || '',
    lastName: u.last_name || '',
    job: u.job || '',
    taskTypes: (0, exports.taskTypesOf)(u),
    roleLibrary: (0, exports.roleLibraryOf)(u),
    admin: (0, exports.isAdmin)(u),
    superAdmin: (0, exports.isSuperAdmin)(u),
};
exports.toPublic = toPublic;
const signToken = (u) => jsonwebtoken_1.default.sign({ sub: u.id }, env_1.env.JWT_SECRET, { expiresIn: '30d' });
exports.signToken = signToken;
const authSession = (token, user) => ({
    token,
    user: (0, exports.toPublic)(user),
});
exports.authSession = authSession;
//# sourceMappingURL=User.view.js.map