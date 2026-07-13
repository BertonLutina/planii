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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const UserModel = __importStar(require("../models/User.model"));
const UserView = __importStar(require("../views/User.view"));
async function register(body) {
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    if (!name || !email || !password)
        (0, http_error_1.fail)(400, 'Nom, email et mot de passe requis');
    if (await UserModel.findByEmail(email))
        (0, http_error_1.fail)(409, 'Cet email est déjà inscrit');
    const job = (body.job || '').trim().slice(0, 60) || null;
    const u = { id: (0, utils_1.uid)(), name, email, pass_hash: bcryptjs_1.default.hashSync(password, 10), job };
    await UserModel.createUser({ id: u.id, name: u.name, email: u.email, pass_hash: u.pass_hash, job });
    return { token: UserView.signToken(u), user: u };
}
async function login(body) {
    const email = (body.email || '').trim().toLowerCase();
    const u = await UserModel.findByEmail(email);
    if (!u || !bcryptjs_1.default.compareSync(body.password || '', u.pass_hash))
        (0, http_error_1.fail)(401, 'Identifiants incorrects');
    await UserModel.touchLastLogin(u.id);
    return { token: UserView.signToken(u), user: u };
}
//# sourceMappingURL=auth.service.js.map