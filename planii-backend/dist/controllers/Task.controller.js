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
exports.listEvents = exports.deleteComment = exports.addComment = exports.listComments = exports.remove = exports.remind = exports.claim = exports.update = exports.create = exports.reorder = exports.listMine = void 0;
const auth_1 = require("../middleware/auth");
const TaskService = __importStar(require("../services/task.service"));
const TaskView = __importStar(require("../views/Task.view"));
exports.listMine = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(TaskView.mine(await TaskService.listMyTasks(req.user.id)));
    })];
exports.reorder = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await TaskService.reorderTasks(req.params.id, req.user.id, Array.isArray(req.body.ids) ? req.body.ids : []);
        res.json({ ok: true });
    })];
exports.create = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const task = await TaskService.createTask(req.params.id, req.user, req.body);
        res.json(TaskView.created(task));
    })];
exports.update = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await TaskService.updateTask(req.params.id, req.user, req.body);
        res.json({ ok: true });
    })];
exports.claim = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await TaskService.claimTask(req.params.id, req.user.id);
        res.json({ ok: true });
    })];
exports.remind = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await TaskService.remindTask(req.params.id, req.user);
        res.json({ ok: true });
    })];
exports.remove = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await TaskService.deleteTask(req.params.id, req.user.id);
        res.json({ ok: true });
    })];
exports.listComments = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(TaskView.comments(await TaskService.listComments(req.params.id, req.user.id)));
    })];
exports.addComment = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(TaskView.commentCreated(await TaskService.addComment(req.params.id, req.user, req.body.body)));
    })];
exports.deleteComment = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await TaskService.deleteComment(req.params.id, req.user.id);
        res.json({ ok: true });
    })];
exports.listEvents = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(TaskView.events(await TaskService.listEvents(req.params.id, req.user.id)));
    })];
//# sourceMappingURL=Task.controller.js.map