"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("./pool");
const logger_1 = require("../logger");
const MIGRATIONS_DIR = path_1.default.join(__dirname, '../../migrations');
async function runMigrations() {
    await pool_1.pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
    const files = fs_1.default.readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    for (const file of files) {
        const id = file.replace(/\.sql$/, '');
        const applied = await pool_1.pool.query('SELECT 1 FROM schema_migrations WHERE id=$1', [id]);
        if (applied.rowCount)
            continue;
        const sql = fs_1.default.readFileSync(path_1.default.join(MIGRATIONS_DIR, file), 'utf8');
        const client = await pool_1.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
            await client.query('COMMIT');
            logger_1.logger.info({ migration: id }, 'Migration appliquée');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
}
if (require.main === module) {
    runMigrations()
        .then(() => { logger_1.logger.info('Migrations terminées'); return pool_1.pool.end(); })
        .catch((e) => { logger_1.logger.error(e); process.exit(1); });
}
//# sourceMappingURL=migrate.js.map