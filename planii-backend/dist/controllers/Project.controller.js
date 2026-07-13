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
exports.deleteTaskStatus = exports.createTaskStatus = exports.setMemberRoles = exports.deleteRole = exports.createRole = exports.remove = exports.update = exports.reopen = exports.close = exports.get = exports.listTasks = exports.reorder = exports.list = exports.create = void 0;
const auth_1 = require("../middleware/auth");
const ProjectService = __importStar(require("../services/project.service"));
const ProjectView = __importStar(require("../views/Project.view"));
exports.create = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const { project, role } = await ProjectService.createProject(req.user.id, req.body);
        res.json(ProjectView.created(project, role));
    })];
exports.list = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const result = await ProjectService.listProjects(req.user.id, req.query);
        if (Array.isArray(result)) {
            res.json({ projects: result });
        }
        else {
            res.json(result);
        }
    })];
exports.reorder = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await ProjectService.reorderProjects(req.user.id, Array.isArray(req.body.ids) ? req.body.ids : []);
        res.json({ ok: true });
    })];
exports.listTasks = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const result = await ProjectService.listProjectTasks(req.params.id, req.user.id, req.query);
        res.json(ProjectView.paginatedTasks(result));
    })];
exports.get = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const { project, myRole } = await ProjectService.getProject(req.params.id, req.user.id);
        res.json(ProjectView.detail(project, myRole));
    })];
exports.close = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await ProjectService.closeProject(req.params.id, req.user.id);
        res.json({ ok: true });
    })];
exports.reopen = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await ProjectService.reopenProject(req.params.id, req.user.id);
        res.json({ ok: true });
    })];
exports.update = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const project = await ProjectService.updateProject(req.params.id, req.user.id, req.body);
        res.json(ProjectView.single(project));
    })];
exports.remove = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const notified = await ProjectService.deleteProject(req.params.id, req.user.id, req.user.name);
        res.json({ ok: true, notified });
    })];
exports.createRole = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const role = await ProjectService.createRole(req.params.id, req.user.id, req.body);
        res.json(ProjectView.roleCreated(role.id, role.name));
    })];
exports.deleteRole = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await ProjectService.deleteRole(req.params.id, req.user.id, req.params.roleId);
        res.json({ ok: true });
    })];
exports.setMemberRoles = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const ids = await ProjectService.setMemberRoles(req.params.id, req.user.id, req.params.userId, req.body.roleIds);
        res.json(ProjectView.memberRoles(ids));
    })];
exports.createTaskStatus = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const statuses = await ProjectService.createTaskStatus(req.params.id, req.user.id, req.body);
        res.json(ProjectView.statuses(statuses));
    })];
exports.deleteTaskStatus = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const statuses = await ProjectService.deleteTaskStatus(req.params.id, req.user.id, req.params.key);
        res.json(ProjectView.statuses(statuses));
    })];
//# sourceMappingURL=Project.controller.js.map