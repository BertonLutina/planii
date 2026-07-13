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
exports.bump = void 0;
exports.wsSend = wsSend;
exports.notifyProject = notifyProject;
exports.logActivity = logActivity;
exports.recordTaskEvent = recordTaskEvent;
exports.notify = notify;
exports.listForUser = listForUser;
exports.markRead = markRead;
exports.removeNotification = removeNotification;
exports.createServer = createServer;
const http_1 = __importDefault(require("http"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ws_1 = require("ws");
const pool_1 = require("../db/pool");
const env_1 = require("../config/env");
const utils_1 = require("../lib/utils");
const ProjectModel = __importStar(require("../models/Project.model"));
const logger_1 = require("../logger");
const wsClients = new Map();
function wsSend(userId, payload) {
    const set = wsClients.get(userId);
    if (!set)
        return;
    const data = JSON.stringify(payload);
    for (const ws of set) {
        try {
            if (ws.readyState === 1)
                ws.send(data);
        }
        catch { /* noop */ }
    }
}
const notifyUser = (userId, payload) => wsSend(userId, payload);
async function notifyProject(projectId, payload) {
    try {
        for (const m of await ProjectModel.findMembers(projectId))
            wsSend(m.user_id, payload);
    }
    catch (e) {
        logger_1.logger.error({ err: e }, 'ws project');
    }
}
const bump = (projectId) => notifyProject(projectId, { type: 'project', projectId });
exports.bump = bump;
async function logActivity(projectId, userId, type, detail) {
    await (0, pool_1.q)('INSERT INTO activity (id,project_id,user_id,type,detail) VALUES ($1,$2,$3,$4,$5)', [(0, utils_1.uid)(), projectId, userId, type, detail || '']);
    (0, exports.bump)(projectId);
}
async function recordTaskEvent(taskId, projectId, actorId, type, payload = {}) {
    await (0, pool_1.q)('INSERT INTO task_events (id,task_id,project_id,actor_id,type,payload) VALUES ($1,$2,$3,$4,$5,$6)', [(0, utils_1.uid)(), taskId, projectId, actorId || null, type, JSON.stringify(payload || {})]);
}
async function notify(userId, type, title, detail) {
    await (0, pool_1.q)('INSERT INTO notifications (id,user_id,type,title,detail) VALUES ($1,$2,$3,$4,$5)', [(0, utils_1.uid)(), userId, type, title, detail || '']);
    notifyUser(userId, { type: 'notif' });
}
async function listForUser(userId) {
    const rows = await (0, pool_1.many)('SELECT id,type,title,detail,read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [userId]);
    const items = rows.map((n) => ({ id: n.id, type: n.type, title: n.title, detail: n.detail, read: n.read, at: n.created_at }));
    return { notifications: items, unread: items.filter((n) => !n.read).length };
}
async function markRead(userId, ids) {
    if (Array.isArray(ids) && ids.length)
        await (0, pool_1.q)('UPDATE notifications SET read=true WHERE user_id=$1 AND id = ANY($2)', [userId, ids]);
    else
        await (0, pool_1.q)('UPDATE notifications SET read=true WHERE user_id=$1', [userId]);
}
async function removeNotification(userId, id) {
    await (0, pool_1.q)('DELETE FROM notifications WHERE user_id=$1 AND id=$2', [userId, id]);
}
function createServer(app) {
    const server = http_1.default.createServer(app);
    const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws, req) => {
        try {
            const url = new URL(req.url || '', 'http://localhost');
            const token = url.searchParams.get('token');
            const payload = jsonwebtoken_1.default.verify(token || '', env_1.env.JWT_SECRET);
            const userId = payload.sub;
            ws.userId = userId;
            ws.isAlive = true;
            if (!wsClients.has(userId))
                wsClients.set(userId, new Set());
            wsClients.get(userId).add(ws);
            ws.on('pong', () => { ws.isAlive = true; });
            ws.on('close', () => {
                const s = wsClients.get(userId);
                if (s) {
                    s.delete(ws);
                    if (!s.size)
                        wsClients.delete(userId);
                }
            });
            ws.on('error', () => { });
            try {
                ws.send(JSON.stringify({ type: 'hello' }));
            }
            catch { /* noop */ }
        }
        catch {
            try {
                ws.close();
            }
            catch { /* noop */ }
        }
    });
    setInterval(() => {
        wss.clients.forEach((ws) => {
            const client = ws;
            if (client.isAlive === false)
                return client.terminate();
            client.isAlive = false;
            try {
                client.ping();
            }
            catch { /* noop */ }
        });
    }, 30000);
    return { server, wss };
}
//# sourceMappingURL=notification.service.js.map