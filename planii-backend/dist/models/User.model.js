"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectManagers = exports.touchLastLogin = exports.findById = exports.findByEmail = void 0;
exports.createUser = createUser;
exports.updateUser = updateUser;
const pool_1 = require("../db/pool");
const findByEmail = (email) => (0, pool_1.one)('SELECT * FROM users WHERE email=$1', [email]);
exports.findByEmail = findByEmail;
const findById = (id) => (0, pool_1.one)('SELECT * FROM users WHERE id=$1', [id]);
exports.findById = findById;
async function createUser(data) {
    await (0, pool_1.q)('INSERT INTO users (id,name,email,pass_hash,job) VALUES ($1,$2,$3,$4,$5)', [data.id, data.name, data.email, data.pass_hash, data.job ?? null]);
}
async function updateUser(id, data) {
    if ('project_label_colors' in data) {
        await (0, pool_1.q)('UPDATE users SET project_label_colors=$1 WHERE id=$2', [data.project_label_colors, id]);
        return;
    }
    await (0, pool_1.q)('UPDATE users SET first_name=$1, last_name=$2, name=$3, job=$4, task_types=$5, role_library=$6, lang=coalesce($7, lang) WHERE id=$8', [data.first_name ?? null, data.last_name ?? null, data.name, data.job ?? null, data.task_types, data.role_library, data.lang ?? null, id]);
}
const touchLastLogin = (id) => (0, pool_1.q)('UPDATE users SET last_login=now() WHERE id=$1', [id]);
exports.touchLastLogin = touchLastLogin;
const projectManagers = (projectId) => (0, pool_1.many)(`SELECT DISTINCT u.id, u.name, u.email, u.lang, m.role
    FROM memberships m JOIN users u ON u.id=m.user_id
    WHERE m.project_id=$1 AND m.role IN ('owner','lead')`, [projectId]);
exports.projectManagers = projectManagers;
//# sourceMappingURL=User.model.js.map