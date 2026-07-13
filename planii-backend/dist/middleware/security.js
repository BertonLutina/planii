"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.authRateLimit = exports.apiRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
const http_error_1 = require("../core/http-error");
const logger_1 = require("../logger");
exports.apiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_1.env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes, réessayez plus tard.' },
});
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_1.env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives de connexion.' },
});
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof http_error_1.HttpError) {
        if (!res.headersSent)
            res.status(err.status).json({ error: err.message });
        return;
    }
    logger_1.logger.error({ err }, 'Erreur serveur');
    if (!res.headersSent)
        res.status(500).json({ error: 'Erreur serveur' });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=security.js.map