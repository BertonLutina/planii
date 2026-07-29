"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageUpload = exports.uploadDir = void 0;
exports.ensureUploadDirs = ensureUploadDirs;
exports.absoluteFromUrl = absoluteFromUrl;
exports.setUserAvatar = setUserAvatar;
exports.clearUserAvatar = clearUserAvatar;
exports.setProjectImage = setProjectImage;
exports.clearProjectImage = clearProjectImage;
exports.deleteProjectImageFiles = deleteProjectImageFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const env_1 = require("../config/env");
const http_error_1 = require("../core/http-error");
const pool_1 = require("../db/pool");
const UserModel = __importStar(require("../models/User.model"));
const ProjectModel = __importStar(require("../models/Project.model"));
const EXT = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};
exports.uploadDir = env_1.env.UPLOAD_DIR;
function ensureUploadDirs() {
    for (const sub of ['avatars', 'projects']) {
        fs_1.default.mkdirSync(path_1.default.join(exports.uploadDir, sub), { recursive: true });
    }
}
ensureUploadDirs();
exports.imageUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!EXT[file.mimetype])
            return cb(new Error('Format invalide (JPEG, PNG ou WebP)'));
        cb(null, true);
    },
});
/** Map stored URL `/uploads/avatars/id.jpg` → absolute file under UPLOAD_DIR. */
function absoluteFromUrl(url) {
    if (!url)
        return null;
    const cleaned = String(url).replace(/^\/+/, '');
    if (!cleaned.startsWith('uploads/'))
        return null;
    const rel = cleaned.slice('uploads/'.length); // avatars/id.jpg
    const abs = path_1.default.resolve(exports.uploadDir, rel);
    const root = path_1.default.resolve(exports.uploadDir);
    if (!abs.startsWith(root + path_1.default.sep) && abs !== root)
        return null;
    return abs;
}
function publicUrl(kind, id, ext) {
    return `/uploads/${kind}/${id}.${ext}`;
}
function unlinkQuiet(filePath) {
    if (!filePath)
        return;
    try {
        if (fs_1.default.existsSync(filePath))
            fs_1.default.unlinkSync(filePath);
    }
    catch { /* ignore */ }
}
function wipeKindFiles(kind, id, previousUrl) {
    unlinkQuiet(absoluteFromUrl(previousUrl || null));
    for (const oldExt of Object.values(EXT)) {
        unlinkQuiet(path_1.default.join(exports.uploadDir, kind, `${id}.${oldExt}`));
    }
}
/** Delete previous image(s) for this id, then write the new file. */
function replaceImage(kind, id, file, previousUrl) {
    const ext = EXT[file.mimetype];
    if (!ext)
        (0, http_error_1.fail)(400, 'Format invalide (JPEG, PNG ou WebP)');
    const dir = path_1.default.join(exports.uploadDir, kind);
    fs_1.default.mkdirSync(dir, { recursive: true });
    wipeKindFiles(kind, id, previousUrl);
    const dest = path_1.default.join(dir, `${id}.${ext}`);
    fs_1.default.writeFileSync(dest, file.buffer);
    return publicUrl(kind, id, ext);
}
async function setUserAvatar(userId, file) {
    if (!file)
        (0, http_error_1.fail)(400, 'Fichier requis');
    const user = await UserModel.findById(userId);
    if (!user)
        (0, http_error_1.fail)(404, 'Utilisateur introuvable');
    const url = replaceImage('avatars', userId, file, user.avatar_url);
    await (0, pool_1.q)('UPDATE users SET avatar_url=$1 WHERE id=$2', [url, userId]);
    return url;
}
async function clearUserAvatar(userId) {
    const user = await UserModel.findById(userId);
    if (!user)
        (0, http_error_1.fail)(404, 'Utilisateur introuvable');
    wipeKindFiles('avatars', userId, user.avatar_url);
    await (0, pool_1.q)('UPDATE users SET avatar_url=NULL WHERE id=$1', [userId]);
}
async function setProjectImage(projectId, userId, file) {
    if (!file)
        (0, http_error_1.fail)(400, 'Fichier requis');
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    if (p.owner_id !== userId)
        (0, http_error_1.fail)(403, 'Seul le propriétaire peut modifier l’image');
    if (ProjectModel.isClosed(p))
        (0, http_error_1.fail)(403, 'Projet clôturé');
    const url = replaceImage('projects', projectId, file, p.image_url);
    await (0, pool_1.q)('UPDATE projects SET image_url=$1 WHERE id=$2', [url, projectId]);
    return url;
}
async function clearProjectImage(projectId, userId) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    if (p.owner_id !== userId)
        (0, http_error_1.fail)(403, 'Seul le propriétaire peut modifier l’image');
    wipeKindFiles('projects', projectId, p.image_url);
    await (0, pool_1.q)('UPDATE projects SET image_url=NULL WHERE id=$1', [projectId]);
}
function deleteProjectImageFiles(projectId, imageUrl) {
    wipeKindFiles('projects', projectId, imageUrl);
}
//# sourceMappingURL=upload.service.js.map