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
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAppointments = listAppointments;
exports.createAppointment = createAppointment;
exports.updateAppointment = updateAppointment;
exports.deleteAppointment = deleteAppointment;
exports.appointmentsForProject = appointmentsForProject;
const pool_1 = require("../db/pool");
const utils_1 = require("../lib/utils");
const http_error_1 = require("../core/http-error");
const env_1 = require("../config/env");
const ProjectModel = __importStar(require("../models/Project.model"));
const UserModel = __importStar(require("../models/User.model"));
const mail_service_1 = require("./mail.service");
const notification_service_1 = require("./notification.service");
function cleanTime(v) {
    const s = String(v || '').trim();
    return /^\d{2}:\d{2}$/.test(s) ? s : '';
}
function cleanDate(v) {
    const s = String(v || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
function formatSlot(date, start, end) {
    const d = new Date(date + 'T12:00:00');
    const label = Number.isNaN(d.getTime())
        ? date
        : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `${label} · ${start} – ${end}`;
}
function assertProjectOpen(p) {
    if (ProjectModel.isClosed(p))
        (0, http_error_1.fail)(423, 'Projet clôturé : seule la réouverture ou la suppression est autorisée');
}
async function assertMember(projectId, userId) {
    const m = await ProjectModel.findMembership(projectId, userId);
    if (!m)
        (0, http_error_1.fail)(403, 'Non membre');
    return m;
}
async function loadParticipants(appointmentId) {
    return (0, pool_1.many)(`SELECT u.id, u.name, u.email FROM appointment_participants ap
     JOIN users u ON u.id = ap.user_id WHERE ap.appointment_id = $1 ORDER BY u.name`, [appointmentId]);
}
async function sendAppointmentMails({ project, actor, appointment, participants, kind, }) {
    const slot = formatSlot(appointment.date, appointment.timeStart, appointment.timeEnd);
    const subject = kind === 'created'
        ? `Rendez-vous : ${appointment.title}`
        : `Rendez-vous modifié : ${appointment.title}`;
    const intro = kind === 'created'
        ? `${actor.name} vous a invité(e) à un rendez-vous dans le projet « ${project.name} ».`
        : `${actor.name} a modifié un rendez-vous du projet « ${project.name} » auquel vous participez.`;
    const rows = [
        ['Projet', project.name],
        ['Intitulé', appointment.title],
        ['Date et créneau', slot],
        appointment.description ? ['Description', appointment.description] : null,
        ['Organisateur', actor.name],
    ];
    for (const p of participants) {
        if (!p.email)
            continue;
        await (0, mail_service_1.sendMail)(p.email, subject, {
            intro,
            rows,
            ctaText: 'Ouvrir Planii',
            ctaUrl: env_1.env.webUrl,
        });
        if (p.id !== actor.id) {
            await (0, notification_service_1.notify)(p.id, kind === 'created' ? 'appointment_created' : 'appointment_updated', subject, `Projet « ${project.name} » · ${slot}`);
        }
    }
}
function appointmentView(row, participants) {
    return {
        id: row.id,
        title: row.title,
        description: row.description || null,
        date: row.appointment_date,
        timeStart: row.time_start,
        timeEnd: row.time_end,
        createdBy: row.created_by,
        at: row.created_at,
        participants,
    };
}
async function listAppointments(projectId, userId) {
    await assertMember(projectId, userId);
    const rows = await (0, pool_1.many)('SELECT * FROM appointments WHERE project_id=$1 ORDER BY appointment_date ASC, time_start ASC', [projectId]);
    const items = [];
    for (const row of rows) {
        const participants = await loadParticipants(String(row.id));
        items.push(appointmentView(row, participants.map((p) => ({ id: p.id, name: p.name }))));
    }
    return items;
}
async function createAppointment(projectId, userId, body) {
    const p = await ProjectModel.findById(projectId);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    await assertMember(p.id, userId);
    assertProjectOpen(p);
    const title = (body.title || '').trim();
    const description = (body.description || '').trim() || null;
    const date = cleanDate(body.date);
    const timeStart = cleanTime(body.timeStart);
    const timeEnd = cleanTime(body.timeEnd);
    const participantIds = [...new Set((body.participantIds || []).map(String).filter(Boolean))];
    if (!title)
        (0, http_error_1.fail)(400, 'Intitulé requis');
    if (!date)
        (0, http_error_1.fail)(400, 'Date invalide');
    if (!timeStart || !timeEnd)
        (0, http_error_1.fail)(400, 'Créneau horaire invalide');
    if (timeStart >= timeEnd)
        (0, http_error_1.fail)(400, 'L’heure de fin doit être après l’heure de début');
    if (!participantIds.length)
        (0, http_error_1.fail)(400, 'Sélectionnez au moins un participant');
    const memberIds = new Set((await (0, pool_1.many)('SELECT user_id FROM memberships WHERE project_id=$1', [p.id]))
        .map((m) => m.user_id));
    for (const pid of participantIds) {
        if (!memberIds.has(pid))
            (0, http_error_1.fail)(400, 'Participant invalide');
    }
    const appointmentId = (0, utils_1.uid)();
    await (0, pool_1.q)(`INSERT INTO appointments (id, project_id, title, description, appointment_date, time_start, time_end, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [appointmentId, p.id, title, description, date, timeStart, timeEnd, userId]);
    for (const pid of participantIds) {
        await (0, pool_1.q)('INSERT INTO appointment_participants (appointment_id, user_id) VALUES ($1,$2)', [appointmentId, pid]);
    }
    const actor = await UserModel.findById(userId);
    const participants = await loadParticipants(appointmentId);
    const slot = formatSlot(date, timeStart, timeEnd);
    await (0, notification_service_1.logActivity)(p.id, userId, 'appointment_created', `a planifié un rendez-vous : « ${title} » (${slot})`);
    (0, notification_service_1.bump)(p.id);
    if (actor) {
        sendAppointmentMails({
            project: p,
            actor,
            appointment: { title, description, date, timeStart, timeEnd },
            participants,
            kind: 'created',
        }).catch(() => { });
    }
    return appointmentId;
}
async function updateAppointment(appointmentId, userId, body) {
    const row = await (0, pool_1.one)('SELECT * FROM appointments WHERE id=$1', [appointmentId]);
    if (!row)
        (0, http_error_1.fail)(404, 'Rendez-vous introuvable');
    const p = await ProjectModel.findById(row.project_id);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await assertMember(p.id, userId);
    assertProjectOpen(p);
    const canEdit = row.created_by === userId || ProjectModel.canManageRole(m.role);
    if (!canEdit)
        (0, http_error_1.fail)(403, 'Seul le créateur ou un responsable peut modifier ce rendez-vous');
    const title = (body.title || '').trim();
    const description = (body.description || '').trim() || null;
    const date = cleanDate(body.date);
    const timeStart = cleanTime(body.timeStart);
    const timeEnd = cleanTime(body.timeEnd);
    const participantIds = [...new Set((body.participantIds || []).map(String).filter(Boolean))];
    if (!title)
        (0, http_error_1.fail)(400, 'Intitulé requis');
    if (!date)
        (0, http_error_1.fail)(400, 'Date invalide');
    if (!timeStart || !timeEnd)
        (0, http_error_1.fail)(400, 'Créneau horaire invalide');
    if (timeStart >= timeEnd)
        (0, http_error_1.fail)(400, 'L’heure de fin doit être après l’heure de début');
    if (!participantIds.length)
        (0, http_error_1.fail)(400, 'Sélectionnez au moins un participant');
    const memberIds = new Set((await (0, pool_1.many)('SELECT user_id FROM memberships WHERE project_id=$1', [p.id]))
        .map((x) => x.user_id));
    for (const pid of participantIds) {
        if (!memberIds.has(pid))
            (0, http_error_1.fail)(400, 'Participant invalide');
    }
    await (0, pool_1.q)(`UPDATE appointments SET title=$1, description=$2, appointment_date=$3, time_start=$4, time_end=$5
     WHERE id=$6`, [title, description, date, timeStart, timeEnd, appointmentId]);
    await (0, pool_1.q)('DELETE FROM appointment_participants WHERE appointment_id=$1', [appointmentId]);
    for (const pid of participantIds) {
        await (0, pool_1.q)('INSERT INTO appointment_participants (appointment_id, user_id) VALUES ($1,$2)', [appointmentId, pid]);
    }
    const actor = await UserModel.findById(userId);
    const participants = await loadParticipants(appointmentId);
    const slot = formatSlot(date, timeStart, timeEnd);
    await (0, notification_service_1.logActivity)(p.id, userId, 'appointment_updated', `a modifié le rendez-vous : « ${title} » (${slot})`);
    (0, notification_service_1.bump)(p.id);
    if (actor) {
        sendAppointmentMails({
            project: p,
            actor,
            appointment: { title, description, date, timeStart, timeEnd },
            participants,
            kind: 'updated',
        }).catch(() => { });
    }
}
async function deleteAppointment(appointmentId, userId) {
    const row = await (0, pool_1.one)('SELECT * FROM appointments WHERE id=$1', [appointmentId]);
    if (!row)
        (0, http_error_1.fail)(404, 'Rendez-vous introuvable');
    const p = await ProjectModel.findById(row.project_id);
    if (!p)
        (0, http_error_1.fail)(404, 'Projet introuvable');
    const m = await assertMember(p.id, userId);
    assertProjectOpen(p);
    const canDelete = row.created_by === userId || ProjectModel.canManageRole(m.role);
    if (!canDelete)
        (0, http_error_1.fail)(403, 'Seul le créateur ou un responsable peut supprimer ce rendez-vous');
    await (0, pool_1.q)('DELETE FROM appointments WHERE id=$1', [appointmentId]);
    await (0, notification_service_1.logActivity)(p.id, userId, 'appointment_deleted', `a supprimé le rendez-vous : « ${row.title} »`);
    (0, notification_service_1.bump)(p.id);
}
async function appointmentsForProject(projectId) {
    const rows = await (0, pool_1.many)('SELECT * FROM appointments WHERE project_id=$1 ORDER BY appointment_date ASC, time_start ASC', [projectId]);
    const items = [];
    for (const row of rows) {
        const participants = await (0, pool_1.many)(`SELECT u.id, u.name FROM appointment_participants ap
       JOIN users u ON u.id = ap.user_id WHERE ap.appointment_id = $1 ORDER BY u.name`, [row.id]);
        items.push(appointmentView(row, participants));
    }
    return items;
}
//# sourceMappingURL=appointment.service.js.map