"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.paginated = paginated;
function parsePagination(query, defaults = {}) {
    const page = Math.max(1, parseInt(String(query.page ?? defaults.page ?? 1), 10) || 1);
    const max = defaults.maxLimit ?? 100;
    const rawLimit = parseInt(String(query.limit ?? defaults.limit ?? 50), 10) || defaults.limit || 50;
    const limit = Math.min(max, Math.max(1, rawLimit));
    return { page, limit, offset: (page - 1) * limit };
}
function paginated(items, total, page, limit) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        items,
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
    };
}
//# sourceMappingURL=pagination.js.map