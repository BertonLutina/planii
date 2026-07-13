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
exports.activity = exports.vote = exports.create = void 0;
const auth_1 = require("../middleware/auth");
const PollService = __importStar(require("../services/poll.service"));
const ProjectView = __importStar(require("../views/Project.view"));
exports.create = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ pollId: await PollService.createPoll(req.params.id, req.user.id, req.body) });
    })];
exports.vote = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await PollService.vote(req.params.id, req.user.id, req.body.optionId);
        res.json({ ok: true });
    })];
exports.activity = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(ProjectView.activityPaginated(await PollService.listActivity(req.params.id, req.user.id, req.query)));
    })];
//# sourceMappingURL=Poll.controller.js.map