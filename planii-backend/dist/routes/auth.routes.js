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
exports.authRoutes = authRoutes;
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const AuthController = __importStar(require("../controllers/Auth.controller"));
const security_1 = require("../middleware/security");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../schemas");
const env_1 = require("../config/env");
const oauth_service_1 = require("../services/oauth.service");
const OAUTH_PROVIDERS = ['google', 'microsoft', 'linkedin', 'yahoo'];
function oauthCallbackHandler(provider) {
    return (req, res, next) => {
        passport_1.default.authenticate(provider, { session: false }, (err, result) => {
            if (err || !result) {
                return res.redirect(`${env_1.env.webUrl.replace(/\/$/, '')}/?authError=${provider}`);
            }
            const token = encodeURIComponent(result.token);
            return res.redirect(`${env_1.env.webUrl.replace(/\/$/, '')}/?oauth_token=${token}`);
        })(req, res, next);
    };
}
function authRoutes() {
    const r = (0, express_1.Router)();
    r.post('/register', security_1.authRateLimit, (0, validate_1.validate)(schemas_1.registerSchema), AuthController.register);
    r.post('/login', security_1.authRateLimit, (0, validate_1.validate)(schemas_1.loginSchema), AuthController.login);
    r.get('/providers', (_req, res) => {
        res.json((0, oauth_service_1.oauthProvidersStatus)());
    });
    for (const provider of OAUTH_PROVIDERS) {
        if (!(0, oauth_service_1.oauthConfigured)(provider))
            continue;
        r.get(`/${provider}`, security_1.authRateLimit, passport_1.default.authenticate(provider, { session: true }));
        r.get(`/${provider}/callback`, security_1.authRateLimit, oauthCallbackHandler(provider));
    }
    return r;
}
//# sourceMappingURL=auth.routes.js.map