"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskById = void 0;
const pool_1 = require("../db/pool");
const taskById = (id) => (0, pool_1.one)('SELECT * FROM tasks WHERE id=$1', [id]);
exports.taskById = taskById;
//# sourceMappingURL=task.repo.js.map