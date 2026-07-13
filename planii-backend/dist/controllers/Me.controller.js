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
exports.deleteProjectLabel = exports.deleteProjectLabelColor = exports.patchProjectLabelColors = exports.createProjectLabel = exports.getProjectLabels = exports.patchMe = exports.getMe = void 0;
const auth_1 = require("../middleware/auth");
const MeService = __importStar(require("../services/me.service"));
const UserView = __importStar(require("../views/User.view"));
exports.getMe = [auth_1.auth, (req, res) => res.json({ user: UserView.toPublic(req.user) })];
exports.patchMe = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        const user = await MeService.updateProfile(req.user, req.body);
        res.json({ user: UserView.toPublic(user) });
    })];
exports.getProjectLabels = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json(await MeService.listProjectLabels(req.user.id));
    })];
exports.createProjectLabel = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ label: await MeService.createProjectLabel(req.user.id, req.body) });
    })];
exports.patchProjectLabelColors = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ colors: await MeService.addProjectLabelColor(req.user.id, req.body) });
    })];
exports.deleteProjectLabelColor = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ colors: await MeService.removeProjectLabelColor(req.user.id, req.params.color) });
    })];
exports.deleteProjectLabel = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await MeService.deleteProjectLabel(req.user.id, req.params.id);
        res.json({ ok: true });
    })];
//# sourceMappingURL=Me.controller.js.map