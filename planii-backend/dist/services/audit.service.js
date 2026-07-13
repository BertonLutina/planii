"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const pool_1 = require("../db/pool");
const utils_1 = require("../lib/utils");
const logger_1 = require("../logger");
async function audit(actor, action, detail) {
    try {
        await (0, pool_1.q)('INSERT INTO admin_audit (id,actor_id,actor_name,action,detail) VALUES ($1,$2,$3,$4,$5)', [(0, utils_1.uid)(), actor.id, actor.name, action, detail || '']);
    }
    catch (e) {
        logger_1.logger.error({ err: e }, 'audit');
    }
}
//# sourceMappingURL=audit.service.js.map