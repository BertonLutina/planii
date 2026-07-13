"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.many = exports.one = exports.q = exports.pool = void 0;
exports.withTransaction = withTransaction;
const pg_1 = require("pg");
const env_1 = require("../config/env");
exports.pool = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
    ssl: env_1.env.pgSsl ? { rejectUnauthorized: false } : undefined,
});
const q = (text, params) => exports.pool.query(text, params);
exports.q = q;
const one = async (text, params) => (await exports.pool.query(text, params)).rows[0] || null;
exports.one = one;
const many = async (text, params) => (await exports.pool.query(text, params)).rows;
exports.many = many;
async function withTransaction(fn) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=pool.js.map