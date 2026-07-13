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
exports.deleteProject = exports.listProjects = exports.setTaskPriority = exports.listTasks = exports.replyMail = exports.sendMail = exports.readMail = exports.listMail = exports.audit = exports.setUserAdmin = exports.deleteUser = exports.listUsers = exports.stats = void 0;
const auth_1 = require("../middleware/auth");
const AdminService = __importStar(require("../services/admin.service"));
const AdminView = __importStar(require("../views/Admin.view"));
exports.stats = [auth_1.auth, auth_1.adminOnly, (0, auth_1.asyncHandler)(async (_req, res) => {
        res.json(AdminView.stats(await AdminService.getStats()));
    })];
exports.listUsers = [auth_1.auth, auth_1.adminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(AdminView.paginated(await AdminService.listUsers(req.query)));
    })];
exports.deleteUser = [auth_1.auth, auth_1.adminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        const deletedProjects = await AdminService.deleteUser(req.user, req.params.id);
        res.json({ ok: true, deletedProjects });
    })];
exports.setUserAdmin = [auth_1.auth, auth_1.superAdminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        const admin = await AdminService.setUserAdmin(req.user, req.params.id, !!req.body.admin);
        res.json({ ok: true, admin });
    })];
exports.audit = [auth_1.auth, auth_1.superAdminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        const result = await AdminService.listAudit(req.query);
        res.json({
            ...AdminView.paginated(result),
            audit: result.items.map((row) => ({
                id: row.id,
                actor: row.actor_name,
                action: row.action,
                detail: row.detail,
                at: row.created_at,
            })),
        });
    })];
exports.listMail = [auth_1.auth, auth_1.superAdminOnly, (0, auth_1.asyncHandler)(async (_req, res) => {
        const data = await AdminService.listMail();
        res.json(AdminView.mailList(data.messages, data.mailbox));
    })];
exports.readMail = [auth_1.auth, auth_1.superAdminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(AdminView.mailMessage(await AdminService.readMail(req.params.uid)));
    })];
exports.sendMail = [auth_1.auth, auth_1.superAdminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        await AdminService.sendMail(req.user, req.body);
        res.json({ ok: true });
    })];
exports.replyMail = [auth_1.auth, auth_1.superAdminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        await AdminService.replyMail(req.user, req.params.uid, req.body.body);
        res.json({ ok: true });
    })];
exports.listTasks = [auth_1.auth, auth_1.adminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(AdminView.paginated(await AdminService.listTasks(req.query)));
    })];
exports.setTaskPriority = [auth_1.auth, auth_1.adminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        const priority = await AdminService.setTaskPriority(req.user, req.params.id, req.body.priority);
        res.json({ ok: true, priority });
    })];
exports.listProjects = [auth_1.auth, auth_1.adminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(AdminView.paginated(await AdminService.listProjects(req.query)));
    })];
exports.deleteProject = [auth_1.auth, auth_1.adminOnly, (0, auth_1.asyncHandler)(async (req, res) => {
        await AdminService.deleteProject(req.user, req.params.id);
        res.json({ ok: true });
    })];
//# sourceMappingURL=Admin.controller.js.map