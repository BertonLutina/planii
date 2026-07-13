"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = check;
const pool_1 = require("../db/pool");
async function check() {
    await (0, pool_1.q)('SELECT 1');
    return { ok: true, name: 'planii-backend', db: 'postgres' };
}
//# sourceMappingURL=health.service.js.map