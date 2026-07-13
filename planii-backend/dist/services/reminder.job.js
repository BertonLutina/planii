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
exports.runDeadlineReminders = runDeadlineReminders;
exports.startReminderScheduler = startReminderScheduler;
const pool_1 = require("../db/pool");
const utils_1 = require("../lib/utils");
const UserModel = __importStar(require("../models/User.model"));
const mail_service_1 = require("./mail.service");
const notification_service_1 = require("./notification.service");
const logger_1 = require("../logger");
const env_1 = require("../config/env");
async function runDeadlineReminders() {
    const tomorrow = (0, utils_1.parisDate)(1);
    const today = (0, utils_1.parisDate)(0);
    const tasks = await (0, pool_1.many)(`SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.name AS project_name, u.email AS email
      FROM tasks t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due=$1 AND t.assignee_id IS NOT NULL`, [tomorrow]);
    let sent = 0;
    for (const t of tasks) {
        const already = await (0, pool_1.one)('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, tomorrow]);
        if (already)
            continue;
        await (0, pool_1.q)('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, tomorrow]);
        await (0, mail_service_1.sendMail)(t.email, `Rappel : « ${t.title} » à rendre demain`, {
            intro: `La tâche « ${t.title} » du projet « ${t.project_name} » arrive à échéance demain.`,
            rows: [['Projet', t.project_name], ['Échéance', t.due], ['Priorité', 'P' + (t.priority || 6)]],
            ctaText: 'Ouvrir Planii',
            ctaUrl: env_1.env.webUrl,
        });
        await (0, notification_service_1.notify)(t.assignee_id, 'deadline', `Échéance demain : ${t.title}`, `Projet « ${t.project_name} »`);
        sent++;
    }
    const overdue = await (0, pool_1.many)(`SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.id AS project_id, p.name AS project_name,
        u.name AS assignee_name, u.email AS assignee_email
      FROM tasks t
      JOIN projects p ON p.id=t.project_id
      JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due IS NOT NULL AND t.due < $1 AND t.assignee_id IS NOT NULL`, [today]);
    for (const t of overdue) {
        const markDate = today;
        const already = await (0, pool_1.one)('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, markDate]);
        if (already)
            continue;
        await (0, pool_1.q)('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, markDate]);
        const rows = [
            ['Projet', t.project_name],
            ['Tâche', t.title],
            ['Responsable', t.assignee_name],
            ['Échéance', t.due],
            ['Priorité', 'P' + (t.priority || 6)],
        ];
        await (0, mail_service_1.sendMail)(t.assignee_email, `En retard : « ${t.title} »`, {
            intro: `Vous êtes en retard sur la tâche « ${t.title} » du projet « ${t.project_name} ».`,
            rows,
            ctaText: 'Ouvrir Planii',
            ctaUrl: env_1.env.webUrl,
        });
        await (0, notification_service_1.notify)(t.assignee_id, 'task_overdue', `Tâche en retard : ${t.title}`, `Projet « ${t.project_name} »`);
        for (const manager of await UserModel.projectManagers(t.project_id)) {
            if (!manager.email || manager.id === t.assignee_id)
                continue;
            await (0, mail_service_1.sendMail)(manager.email, `Retard dans « ${t.project_name} »`, {
                intro: `${t.assignee_name} est en retard sur la tâche « ${t.title} ».`,
                rows,
                ctaText: 'Ouvrir Planii',
                ctaUrl: env_1.env.webUrl,
            });
        }
        sent++;
    }
    return sent;
}
let lastReminderDay = null;
function startReminderScheduler() {
    setInterval(async () => {
        try {
            const today = (0, utils_1.parisDate)(0);
            if ((0, utils_1.parisHour)() >= 18 && lastReminderDay !== today) {
                lastReminderDay = today;
                const n = await runDeadlineReminders();
                if (n)
                    logger_1.logger.info(`Rappels d'échéance envoyés : ${n} (${today})`);
            }
        }
        catch (e) {
            logger_1.logger.error({ err: e }, 'scheduler');
        }
    }, 5 * 60 * 1000);
}
//# sourceMappingURL=reminder.job.js.map