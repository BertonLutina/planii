"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.fail = fail;
class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
function fail(status, message) {
    throw new HttpError(status, message);
}
//# sourceMappingURL=http-error.js.map