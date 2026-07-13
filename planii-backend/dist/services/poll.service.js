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
exports.createPoll = createPoll;
exports.vote = vote;
exports.listActivity = listActivity;
const pool_1 = require("../db/pool");
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const ProjectModel = __importStar(require("../models/Project.model"));
const pagination_1 = require("../lib/pagination");
const ProjectView = __importStar(require("../views/Project.view"));
const project_service_1 = require("./project.service");
const notification_service_1 = require("./notification.service");
async function createPoll(projectId, userId, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await ProjectModel.findMembership(p.id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    (0, project_service_1.assertProjectOpen)(p);
    const question = (body.question || '').trim();
    const options = (body.options || []).map((o) => (o || '').trim()).filter(Boolean);
    if (!question || options.length < 2)
        (0, http_error_1.fail)(400, 'Question et au moins 2 options requises');
    const pollId = (0, utils_1.uid)();
    await (0, pool_1.q)('INSERT INTO polls (id,project_id,question,created_by) VALUES ($1,$2,$3,$4)', [pollId, p.id, question, userId]);
    for (const label of options)
        await (0, pool_1.q)('INSERT INTO poll_options (id,poll_id,label) VALUES ($1,$2,$3)', [(0, utils_1.uid)(), pollId, label]);
    await (0, notification_service_1.logActivity)(p.id, userId, 'poll_created', `a lancé un sondage : « ${question} »`);
    return pollId;
}
async function vote(pollId, userId, optionId) {
    const poll = await (0, pool_1.one)('SELECT * FROM polls WHERE id=$1', [pollId]);
    if (!poll)
        (0, http_error_1.fail)(404, 'Sondage introuvable');
    const m = await ProjectModel.findMembership(poll.project_id, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const p = await ProjectModel.findById(poll.project_id);
    (0, project_service_1.assertProjectOpen)(p);
    const opt = await (0, pool_1.one)('SELECT * FROM poll_options WHERE poll_id=$1 AND id=$2', [poll.id, optionId]);
    if (!opt)
        (0, http_error_1.fail)(400, 'Option invalide');
    await (0, pool_1.q)(`INSERT INTO poll_votes (poll_id,option_id,user_id) VALUES ($1,$2,$3)
    ON CONFLICT (poll_id,user_id) DO UPDATE SET option_id=excluded.option_id`, [poll.id, opt.id, userId]);
    (0, notification_service_1.bump)(poll.project_id);
}
async function listActivity(projectId, userId, query = {}) {
    const m = await ProjectModel.findMembership(projectId, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    const { page, limit, offset } = (0, pagination_1.parsePagination)(query, { limit: 30 });
    const countRow = await (0, pool_1.one)('SELECT count(*)::int AS c FROM activity WHERE project_id=$1', [projectId]);
    const total = Number(countRow.c) || 0;
    const rows = await (0, pool_1.many)(`SELECT a.*, u.name AS user_name FROM activity a
    LEFT JOIN users u ON u.id=a.user_id WHERE a.project_id=$1
    ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`, [projectId]);
    const items = rows.map((a) => ProjectView.activityItem(a));
    return (0, pagination_1.paginated)(items, total, page, limit);
}
//# sourceMappingURL=poll.service.js.map