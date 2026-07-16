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
exports.projectsRoutes = projectsRoutes;
const express_1 = require("express");
const ProjectController = __importStar(require("../controllers/Project.controller"));
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
function projectsRoutes() {
    const r = (0, express_1.Router)();
    r.post('/projects', (0, validate_1.validate)(schemas_1.projectCreateSchema), ...ProjectController.create);
    r.get('/projects', ...ProjectController.list);
    r.put('/projects/order', (0, validate_1.validate)(schemas_1.idsSchema), ...ProjectController.reorder);
    r.get('/projects/:id/tasks', ...ProjectController.listTasks);
    r.get('/projects/:id', ...ProjectController.get);
    r.post('/projects/:id/close', ...ProjectController.close);
    r.post('/projects/:id/reopen', ...ProjectController.reopen);
    r.patch('/projects/:id', (0, validate_1.validate)(schemas_1.projectUpdateSchema), ...ProjectController.update);
    r.delete('/projects/:id', ...ProjectController.remove);
    r.post('/projects/:id/roles', (0, validate_1.validate)(schemas_1.roleNameSchema), ...ProjectController.createRole);
    r.delete('/projects/:id/roles/:roleId', ...ProjectController.deleteRole);
    r.put('/projects/:id/members/:userId/roles', (0, validate_1.validate)(schemas_1.memberRolesSchema), ...ProjectController.setMemberRoles);
    r.post('/projects/:id/task-statuses', (0, validate_1.validate)(schemas_1.taskStatusSchema), ...ProjectController.createTaskStatus);
    r.delete('/projects/:id/task-statuses/:key', ...ProjectController.deleteTaskStatus);
    return r;
}
//# sourceMappingURL=projects.routes.js.map