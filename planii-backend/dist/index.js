"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const logger_1 = require("./logger");
const migrate_1 = require("./db/migrate");
const app_1 = require("./app");
const notification_service_1 = require("./services/notification.service");
const reminder_job_1 = require("./services/reminder.job");
async function main() {
    await (0, migrate_1.runMigrations)();
    const app = (0, app_1.createApp)();
    const { server } = (0, notification_service_1.createServer)(app);
    (0, reminder_job_1.startReminderScheduler)();
    server.listen(env_1.env.PORT, '0.0.0.0', () => {
        logger_1.logger.info(`Planii backend (PostgreSQL + WebSocket) en écoute sur 0.0.0.0:${env_1.env.PORT} — APP_URL=${env_1.env.appUrl}`);
    });
}
main().catch((e) => {
    logger_1.logger.error({ err: e }, 'Échec démarrage');
    process.exit(1);
});
//# sourceMappingURL=index.js.map