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
exports.createTask = exports.setTaskDelegates = exports.listTaskDelegates = exports.postMessage = exports.listMessages = void 0;
const auth_1 = require("../middleware/auth");
const MeetingService = __importStar(require("../services/meeting.service"));
const TaskView = __importStar(require("../views/Task.view"));
exports.listMessages = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ messages: await MeetingService.listMessages(req.params.id, req.user.id) });
    })];
exports.postMessage = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ message: await MeetingService.postMessage(req.params.id, req.user, req.body.body) });
    })];
exports.listTaskDelegates = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ userIds: await MeetingService.listTaskDelegates(req.params.id, req.user.id) });
    })];
exports.setTaskDelegates = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ userIds: await MeetingService.setTaskDelegates(req.params.id, req.user.id, req.body.userIds) });
    })];
exports.createTask = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(TaskView.meetingCreated(await MeetingService.createMeetingTask(req.params.id, req.user, req.body)));
    })];
//# sourceMappingURL=Meeting.controller.js.map