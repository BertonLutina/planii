"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pino_http_1 = __importDefault(require("pino-http"));
const env_1 = require("./config/env");
const logger_1 = require("./logger");
const security_1 = require("./middleware/security");
const routes_1 = require("./routes");
function createApp() {
    const app = (0, express_1.default)();
    if (env_1.env.corsOrigins === '*')
        app.use((0, cors_1.default)());
    else
        app.use((0, cors_1.default)({ origin: env_1.env.corsOrigins }));
    app.use(express_1.default.json());
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    app.use('/api', security_1.apiRateLimit);
    app.use('/api', (0, routes_1.apiRoutes)());
    app.use(security_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map