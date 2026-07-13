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
exports.remove = exports.update = exports.create = exports.list = void 0;
const auth_1 = require("../middleware/auth");
const AppointmentService = __importStar(require("../services/appointment.service"));
exports.list = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ appointments: await AppointmentService.listAppointments(req.params.id, req.user.id) });
    })];
exports.create = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        res.json({ appointmentId: await AppointmentService.createAppointment(req.params.id, req.user.id, req.body) });
    })];
exports.update = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await AppointmentService.updateAppointment(req.params.id, req.user.id, req.body);
        res.json({ ok: true });
    })];
exports.remove = [auth_1.auth, (0, auth_1.asyncHandler)(async (req, res) => {
        await AppointmentService.deleteAppointment(req.params.id, req.user.id);
        res.json({ ok: true });
    })];
//# sourceMappingURL=Appointment.controller.js.map