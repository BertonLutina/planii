"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findById = void 0;
const pool_1 = require("../db/pool");
const findById = (id) => (0, pool_1.one)('SELECT * FROM tasks WHERE id=$1', [id]);
exports.findById = findById;
//# sourceMappingURL=Task.model.js.map