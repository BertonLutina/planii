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
const mail_i18n_1 = require("../lib/mail-i18n");
const mail_service_1 = require("./mail.service");
const notification_service_1 = require("./notification.service");
const logger_1 = require("../logger");
const env_1 = require("../config/env");
async function runDeadlineReminders() {
    const tomorrow = (0, utils_1.parisDate)(1);
    const today = (0, utils_1.parisDate)(0);
    const tasks = await (0, pool_1.many)(`SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.name AS project_name, u.email AS email, u.lang AS lang
      FROM tasks t JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=t.assignee_id
      WHERE NOT t.done AND t.due=$1 AND t.assignee_id IS NOT NULL`, [tomorrow]);
    let sent = 0;
    for (const t of tasks) {
        const already = await (0, pool_1.one)('SELECT 1 AS x FROM task_reminders WHERE task_id=$1 AND for_date=$2', [t.id, tomorrow]);
        if (already)
            continue;
        await (0, pool_1.q)('INSERT INTO task_reminders (task_id,for_date) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.id, tomorrow]);
        await (0, mail_service_1.sendMail)(t.email, (0, mail_i18n_1.mt)(t.lang, 'remind.s', { title: t.title }), {
            intro: (0, mail_i18n_1.mt)(t.lang, 'remind.i', { title: t.title, project: t.project_name }),
            rows: [[(0, mail_i18n_1.mt)(t.lang, 'r.project'), t.project_name], [(0, mail_i18n_1.mt)(t.lang, 'r.due'), t.due], [(0, mail_i18n_1.mt)(t.lang, 'r.priority'), 'P' + (t.priority || 6)]],
            ctaText: (0, mail_i18n_1.mt)(t.lang, 'cta'),
            ctaUrl: env_1.env.webUrl,
        });
        await (0, notification_service_1.notify)(t.assignee_id, 'deadline', `Échéance demain : ${t.title}`, `Projet « ${t.project_name} »`);
        sent++;
    }
    const overdue = await (0, pool_1.many)(`SELECT t.id, t.title, t.due, t.priority, t.assignee_id, p.id AS project_id, p.name AS project_name,
        u.name AS assignee_name, u.email AS assignee_email, u.lang AS assignee_lang
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
        const rowsFor = (l) => [
            [(0, mail_i18n_1.mt)(l, 'r.project'), t.project_name],
            [(0, mail_i18n_1.mt)(l, 'r.task'), t.title],
            [(0, mail_i18n_1.mt)(l, 'r.assignee'), t.assignee_name],
            [(0, mail_i18n_1.mt)(l, 'r.due'), t.due],
            [(0, mail_i18n_1.mt)(l, 'r.priority'), 'P' + (t.priority || 6)],
        ];
        await (0, mail_service_1.sendMail)(t.assignee_email, (0, mail_i18n_1.mt)(t.assignee_lang, 'late.s', { title: t.title }), {
            intro: (0, mail_i18n_1.mt)(t.assignee_lang, 'late.i', { title: t.title, project: t.project_name }),
            rows: rowsFor(t.assignee_lang),
            ctaText: (0, mail_i18n_1.mt)(t.assignee_lang, 'cta'),
            ctaUrl: env_1.env.webUrl,
        });
        await (0, notification_service_1.notify)(t.assignee_id, 'task_overdue', `Tâche en retard : ${t.title}`, `Projet « ${t.project_name} »`);
        for (const manager of await UserModel.projectManagers(t.project_id)) {
            if (!manager.email || manager.id === t.assignee_id)
                continue;
            await (0, mail_service_1.sendMail)(manager.email, (0, mail_i18n_1.mt)(manager.lang, 'lateMgr.s', { project: t.project_name }), {
                intro: (0, mail_i18n_1.mt)(manager.lang, 'lateMgr.i', { assignee: t.assignee_name, title: t.title }),
                rows: rowsFor(manager.lang),
                ctaText: (0, mail_i18n_1.mt)(manager.lang, 'cta'),
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