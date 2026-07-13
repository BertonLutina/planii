"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRoutes = apiRoutes;
const express_1 = require("express");
const auth_routes_1 = require("./auth.routes");
const me_routes_1 = require("./me.routes");
const projects_routes_1 = require("./projects.routes");
const tasks_routes_1 = require("./tasks.routes");
const invites_routes_1 = require("./invites.routes");
const meeting_routes_1 = require("./meeting.routes");
const polls_routes_1 = require("./polls.routes");
const notifications_routes_1 = require("./notifications.routes");
const today_routes_1 = require("./today.routes");
const calendar_routes_1 = require("./calendar.routes");
const admin_routes_1 = require("./admin.routes");
const health_routes_1 = require("./health.routes");
function apiRoutes() {
    const r = (0, express_1.Router)();
    r.use('/auth', (0, auth_routes_1.authRoutes)());
    r.use((0, me_routes_1.meRoutes)());
    r.use((0, projects_routes_1.projectsRoutes)());
    r.use((0, tasks_routes_1.tasksRoutes)());
    r.use((0, invites_routes_1.invitesRoutes)());
    r.use((0, meeting_routes_1.meetingRoutes)());
    r.use((0, polls_routes_1.pollsRoutes)());
    r.use((0, notifications_routes_1.notificationsRoutes)());
    r.use((0, today_routes_1.todayRoutes)());
    r.use((0, calendar_routes_1.calendarRoutes)());
    r.use((0, admin_routes_1.adminRoutes)());
    r.use((0, health_routes_1.healthRoutes)());
    return r;
}
//# sourceMappingURL=index.js.map