"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCalendarEvents = listCalendarEvents;
const pool_1 = require("../db/pool");
const http_error_1 = require("../core/http-error");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
async function listCalendarEvents(userId, from, to) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to))
        (0, http_error_1.fail)(400, 'Paramètres from et to requis (YYYY-MM-DD)');
    if (from > to)
        (0, http_error_1.fail)(400, 'from doit être antérieur à to');
    const taskRows = await (0, pool_1.many)(`SELECT t.id, t.title, t.due::text, t.done, p.id AS project_id, p.name AS project_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN memberships m ON m.project_id = p.id AND m.user_id = $1
      WHERE t.due IS NOT NULL AND NULLIF(t.due,'')::date >= $2::date AND NULLIF(t.due,'')::date <= $3::date
      ORDER BY t.due ASC, t.title ASC`, [userId, from, to]);
    const deadlineRows = await (0, pool_1.many)(`SELECT ('dl-' || p.id) AS id, ('Livraison — ' || p.name) AS title, p.deadline::text AS due,
      p.id AS project_id, p.name AS project_name
      FROM projects p
      JOIN memberships m ON m.project_id = p.id AND m.user_id = $1
      WHERE p.deadline IS NOT NULL AND p.status <> 'done'
        AND NULLIF(p.deadline,'')::date >= $2::date AND NULLIF(p.deadline,'')::date <= $3::date
      ORDER BY p.deadline ASC`, [userId, from, to]);
    const events = [
        ...taskRows.map((r) => ({
            id: r.id,
            date: r.due,
            title: r.title,
            done: r.done,
            deadline: false,
            projectId: r.project_id,
            projectName: r.project_name,
        })),
        ...deadlineRows.map((r) => ({
            id: r.id,
            date: r.due,
            title: r.title,
            done: false,
            deadline: true,
            projectId: r.project_id,
            projectName: r.project_name,
        })),
    ];
    return events;
}
//# sourceMappingURL=calendar.service.js.map