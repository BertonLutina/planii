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
exports.adminRoutes = adminRoutes;
const express_1 = require("express");
const AdminController = __importStar(require("../controllers/Admin.controller"));
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
function adminRoutes() {
    const r = (0, express_1.Router)();
    r.get('/admin/stats', ...AdminController.stats);
    r.get('/admin/users', ...AdminController.listUsers);
    r.delete('/admin/users/:id', ...AdminController.deleteUser);
    r.patch('/admin/users/:id/admin', (0, validate_1.validate)(schemas_1.adminSetAdminSchema), ...AdminController.setUserAdmin);
    r.get('/admin/audit', ...AdminController.audit);
    r.get('/admin/mail', ...AdminController.listMail);
    r.get('/admin/mail/:uid', ...AdminController.readMail);
    r.post('/admin/mail/send', (0, validate_1.validate)(schemas_1.adminMailSendSchema), ...AdminController.sendMail);
    r.post('/admin/mail/:uid/reply', (0, validate_1.validate)(schemas_1.adminMailReplySchema), ...AdminController.replyMail);
    r.get('/admin/tasks', ...AdminController.listTasks);
    r.patch('/admin/tasks/:id/priority', (0, validate_1.validate)(schemas_1.adminPrioritySchema), ...AdminController.setTaskPriority);
    r.get('/admin/projects', ...AdminController.listProjects);
    r.delete('/admin/projects/:id', ...AdminController.deleteProject);
    return r;
}
//# sourceMappingURL=admin.routes.js.map