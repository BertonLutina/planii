"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parisDate = exports.parisHour = exports.slugStatus = exports.cleanLabels = exports.cleanColor = exports.prioOrDefault = exports.numOrNull = exports.newToken = exports.uid = void 0;
const crypto_1 = __importDefault(require("crypto"));
const uid = () => crypto_1.default.randomBytes(9).toString('base64url');
exports.uid = uid;
const newToken = () => crypto_1.default.randomBytes(18).toString('base64url');
exports.newToken = newToken;
const numOrNull = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Math.max(0, Number(v));
exports.numOrNull = numOrNull;
const prioOrDefault = (v) => {
    const n = parseInt(String(v), 10);
    return (n >= 1 && n <= 6) ? n : 6;
};
exports.prioOrDefault = prioOrDefault;
const cleanColor = (v, fallback = '#f59e0b') => /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : fallback;
exports.cleanColor = cleanColor;
const cleanLabels = (arr, maxLen, maxCount) => {
    const out = [];
    for (const t of arr) {
        if (typeof t !== 'string')
            continue;
        const v = t.trim().slice(0, maxLen);
        if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase()))
            out.push(v);
        if (out.length >= maxCount)
            break;
    }
    return out;
};
exports.cleanLabels = cleanLabels;
const slugStatus = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || ('status_' + (0, exports.uid)().slice(0, 6));
exports.slugStatus = slugStatus;
const parisHour = () => parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()), 10);
exports.parisHour = parisHour;
const parisDate = (offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() + offsetDays * 864e5));
exports.parisDate = parisDate;
//# sourceMappingURL=utils.js.map