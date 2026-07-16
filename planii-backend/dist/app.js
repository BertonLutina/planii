"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const env_1 = require("./config/env");
const logger_1 = require("./logger");
const security_1 = require("./middleware/security");
const routes_1 = require("./routes");
function createApp() {
    const app = (0, express_1.default)();
    // Derrière Traefik : faire confiance au 1er proxy pour lire l'IP client réelle
    // (X-Forwarded-For). Sans ça, express-rate-limit voit tous les visiteurs comme
    // une seule IP (celle du proxy) et le quota est partagé par tout le monde.
    app.set('trust proxy', 1);
    // En-têtes de sécurité HTTP. L'API ne renvoie que du JSON : la CSP est gérée côté
    // frontend (nginx). On autorise le partage cross-origin car l'API (api.planii.app)
    // est consommée par le frontend (planii.app), et on force HSTS (6 mois).
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        hsts: { maxAge: 15552000, includeSubDomains: true },
    }));
    const corsOptions = env_1.env.corsOrigins === '*'
        ? { origin: true, credentials: true }
        : {
            origin: env_1.env.corsOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        };
    app.use((0, cors_1.default)(corsOptions));
    app.options('*', (0, cors_1.default)(corsOptions));
    app.use(express_1.default.json());
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    app.use('/api', security_1.apiRateLimit);
    app.use('/api', (0, routes_1.apiRoutes)());
    app.use(security_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map