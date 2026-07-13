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
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.listProjectLabels = listProjectLabels;
exports.createProjectLabel = createProjectLabel;
exports.addProjectLabelColor = addProjectLabelColor;
exports.removeProjectLabelColor = removeProjectLabelColor;
exports.deleteProjectLabel = deleteProjectLabel;
const pool_1 = require("../db/pool");
const utils_1 = require("../lib/utils");
const constants_1 = require("../lib/constants");
const http_error_1 = require("../core/http-error");
const UserModel = __importStar(require("../models/User.model"));
const UserView = __importStar(require("../views/User.view"));
const project_service_1 = require("./project.service");
function getProfile(user) {
    return user;
}
async function updateProfile(user, body) {
    const first = typeof body.firstName === 'string' ? body.firstName.trim() : (user.first_name || '');
    const last = typeof body.lastName === 'string' ? body.lastName.trim() : (user.last_name || '');
    if (first.length > 60 || last.length > 60)
        (0, http_error_1.fail)(400, 'Nom trop long');
    const full = [first, last].filter(Boolean).join(' ').trim() || user.name;
    const job = typeof body.job === 'string' ? (body.job.trim().slice(0, 60) || null) : (user.job || null);
    let taskTypes = UserView.taskTypesOf(user);
    if (Array.isArray(body.taskTypes)) {
        const cleaned = (0, utils_1.cleanLabels)(body.taskTypes, 30, 20);
        taskTypes = cleaned.length ? cleaned : constants_1.DEFAULT_TASK_TYPES;
    }
    const roleLibrary = Array.isArray(body.roleLibrary) ? (0, utils_1.cleanLabels)(body.roleLibrary, 40, 40) : UserView.roleLibraryOf(user);
    await UserModel.updateUser(user.id, {
        first_name: first || null,
        last_name: last || null,
        name: full,
        job,
        task_types: JSON.stringify(taskTypes),
        role_library: JSON.stringify(roleLibrary),
    });
    const u = await UserModel.findById(user.id);
    return u;
}
async function listProjectLabels(userId) {
    return {
        labels: await (0, project_service_1.ensureProjectLabels)(userId),
        colors: UserView.projectLabelColorsOf((await UserModel.findById(userId))),
    };
}
async function createProjectLabel(userId, body) {
    const label = String(body.label || '').trim().slice(0, 28);
    if (!label)
        (0, http_error_1.fail)(400, 'Libellé requis');
    const labels = await (0, project_service_1.ensureProjectLabels)(userId);
    if (labels.length >= 20)
        (0, http_error_1.fail)(400, 'Maximum 20 libellés');
    if (labels.some((l) => String(l.label).toLowerCase() === label.toLowerCase()))
        (0, http_error_1.fail)(409, 'Ce libellé existe déjà');
    const color = (0, utils_1.cleanColor)(body.color, constants_1.PROJECT_LABEL_COLORS[labels.length % constants_1.PROJECT_LABEL_COLORS.length]);
    const user = await UserModel.findById(userId);
    const colors = UserView.projectLabelColorsOf(user);
    if (!colors.some((c) => c.toLowerCase() === color.toLowerCase())) {
        await UserModel.updateUser(userId, {
            first_name: user.first_name,
            last_name: user.last_name,
            name: user.name,
            job: user.job,
            task_types: JSON.stringify(UserView.taskTypesOf(user)),
            role_library: JSON.stringify(UserView.roleLibraryOf(user)),
            project_label_colors: JSON.stringify((0, utils_1.cleanLabels)([...colors, color], 7, 40)),
        });
    }
    const maxPos = labels.reduce((m, l) => Math.max(m, Number(l.position) || 0), 0);
    const id = (0, utils_1.uid)();
    await (0, pool_1.q)('INSERT INTO project_labels (id,user_id,label,color,position,fixed) VALUES ($1,$2,$3,$4,$5,false)', [id, userId, label, color, maxPos + 1]);
    return (0, pool_1.one)('SELECT id,label,color,position,fixed FROM project_labels WHERE id=$1', [id]);
}
async function addProjectLabelColor(userId, body) {
    const color = (0, utils_1.cleanColor)(body.color, '');
    if (!color)
        (0, http_error_1.fail)(400, 'Couleur invalide');
    const user = await UserModel.findById(userId);
    const colors = (0, utils_1.cleanLabels)([...UserView.projectLabelColorsOf(user), color], 7, 40);
    await UserModel.updateUser(userId, {
        first_name: user.first_name,
        last_name: user.last_name,
        name: user.name,
        job: user.job,
        task_types: JSON.stringify(UserView.taskTypesOf(user)),
        role_library: JSON.stringify(UserView.roleLibraryOf(user)),
        project_label_colors: JSON.stringify(colors.filter((c) => !constants_1.PROJECT_LABEL_COLORS.some((d) => d.toLowerCase() === c.toLowerCase()))),
    });
    const u = await UserModel.findById(userId);
    return UserView.projectLabelColorsOf(u);
}
async function removeProjectLabelColor(userId, colorParam) {
    const color = (0, utils_1.cleanColor)('#' + String(colorParam || '').replace(/^#/, ''), '');
    if (!color)
        (0, http_error_1.fail)(400, 'Couleur invalide');
    if (constants_1.PROJECT_LABEL_COLORS.some((c) => c.toLowerCase() === color.toLowerCase()))
        (0, http_error_1.fail)(400, 'Couleur par défaut');
    const user = await UserModel.findById(userId);
    const custom = UserView.projectLabelColorsOf(user)
        .filter((c) => !constants_1.PROJECT_LABEL_COLORS.some((d) => d.toLowerCase() === c.toLowerCase()) && c.toLowerCase() !== color.toLowerCase());
    await UserModel.updateUser(userId, {
        first_name: user.first_name,
        last_name: user.last_name,
        name: user.name,
        job: user.job,
        task_types: JSON.stringify(UserView.taskTypesOf(user)),
        role_library: JSON.stringify(UserView.roleLibraryOf(user)),
        project_label_colors: JSON.stringify(custom),
    });
    const u = await UserModel.findById(userId);
    return UserView.projectLabelColorsOf(u);
}
async function deleteProjectLabel(userId, labelId) {
    const label = await (0, pool_1.one)('SELECT * FROM project_labels WHERE id=$1 AND user_id=$2', [labelId, userId]);
    if (!label)
        (0, http_error_1.fail)(404, 'Libellé introuvable');
    if (label.fixed)
        (0, http_error_1.fail)(400, 'Ce libellé par défaut ne peut pas être supprimé');
    const fallback = await (0, project_service_1.defaultProjectLabelId)(userId);
    await (0, pool_1.q)('UPDATE projects SET label_id=$1 WHERE owner_id=$2 AND label_id=$3', [fallback, userId, label.id]);
    await (0, pool_1.q)('DELETE FROM project_labels WHERE id=$1 AND user_id=$2', [label.id, userId]);
}
//# sourceMappingURL=me.service.js.map