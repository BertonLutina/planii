"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPrioritySchema = exports.adminMailReplySchema = exports.adminMailSendSchema = exports.adminSetAdminSchema = exports.pollVoteSchema = exports.pollCreateSchema = exports.meetingTaskSchema = exports.meetingDelegatesSchema = exports.meetingMessageSchema = exports.appointmentUpdateSchema = exports.appointmentCreateSchema = exports.inviteCreateSchema = exports.commentSchema = exports.taskUpdateSchema = exports.taskCreateSchema = exports.taskStatusSchema = exports.memberRolesSchema = exports.roleNameSchema = exports.idsSchema = exports.projectUpdateSchema = exports.projectCreateSchema = exports.labelColorsSchema = exports.projectLabelSchema = exports.meUpdateSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
/** Schémas de validation des bodies. Principe : défensif mais non cassant.
 *  - .passthrough() : les champs non listés sont conservés tels quels.
 *  - .nullish() : champ optionnel ET nullable (le front envoie souvent null).
 *  - pas de coercition de type qui modifierait ce que reçoit le service. */
const priority = zod_1.z.number().int().min(0).max(10);
const strList = zod_1.z.array(zod_1.z.string());
const numOrStr = zod_1.z.union([zod_1.z.string(), zod_1.z.number()]);
// ---- Auth ----
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'nom requis').max(120),
    email: zod_1.z.string().min(3, 'email requis').max(200),
    password: zod_1.z.string().min(1, 'mot de passe requis').max(200),
    job: zod_1.z.string().max(60).nullish(),
}).passthrough();
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().min(1, 'email requis').max(200),
    password: zod_1.z.string().min(1, 'mot de passe requis').max(200),
}).passthrough();
// ---- Me / profil ----
exports.meUpdateSchema = zod_1.z.object({
    firstName: zod_1.z.string().max(120).nullish(),
    lastName: zod_1.z.string().max(120).nullish(),
    job: zod_1.z.string().max(60).nullish(),
    taskTypes: zod_1.z.array(zod_1.z.any()).nullish(),
    roleLibrary: zod_1.z.array(zod_1.z.any()).nullish(),
}).passthrough();
exports.projectLabelSchema = zod_1.z.object({
    label: zod_1.z.string().min(1, 'libellé requis').max(60),
    color: zod_1.z.string().max(40).nullish(),
}).passthrough();
exports.labelColorsSchema = zod_1.z.object({}).passthrough();
// ---- Projets ----
exports.projectCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'nom du projet requis').max(160),
    type: zod_1.z.string().max(20).nullish(),
    labelId: zod_1.z.string().max(80).nullish(),
    deadline: zod_1.z.string().max(40).nullish(),
}).passthrough();
exports.projectUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(160).optional(),
    deadline: zod_1.z.string().max(40).nullish(),
    labelId: zod_1.z.string().max(80).nullish(),
}).passthrough();
exports.idsSchema = zod_1.z.object({ ids: strList.default([]) }).passthrough();
exports.roleNameSchema = zod_1.z.object({ name: zod_1.z.string().min(1, 'nom du rôle requis').max(80) }).passthrough();
exports.memberRolesSchema = zod_1.z.object({ roleIds: strList.default([]) }).passthrough();
exports.taskStatusSchema = zod_1.z.object({
    label: zod_1.z.string().max(60).nullish(),
    name: zod_1.z.string().max(60).nullish(),
    color: zod_1.z.string().max(40).nullish(),
}).passthrough();
// ---- Tâches ----
exports.taskCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'titre requis').max(300),
    description: zod_1.z.string().max(5000).nullish(),
    type: zod_1.z.string().max(40).nullish(),
    assigneeId: zod_1.z.string().nullish(),
    due: zod_1.z.string().max(40).nullish(),
    estHours: numOrStr.nullish(),
    priority: priority.nullish(),
    transferable: zod_1.z.boolean().nullish(),
    statusKey: zod_1.z.string().max(40).nullish(),
    parentId: zod_1.z.string().nullish(),
}).passthrough();
exports.taskUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(300).optional(),
    description: zod_1.z.string().max(5000).nullish(),
    type: zod_1.z.string().max(40).nullish(),
    assigneeId: zod_1.z.string().nullish(),
    due: zod_1.z.string().max(40).nullish(),
    estHours: numOrStr.nullish(),
    priority: priority.nullish(),
    transferable: zod_1.z.boolean().nullish(),
    statusKey: zod_1.z.string().max(40).nullish(),
    transferredTo: zod_1.z.string().nullish(),
    done: zod_1.z.boolean().nullish(),
}).passthrough();
exports.commentSchema = zod_1.z.object({ body: zod_1.z.string().min(1, 'commentaire vide').max(5000) }).passthrough();
// ---- Invitations ----
exports.inviteCreateSchema = zod_1.z.object({
    role: zod_1.z.string().max(80).nullish(),
    email: zod_1.z.string().max(200).nullish(),
}).passthrough();
// ---- Rendez-vous ----
exports.appointmentCreateSchema = zod_1.z.object({
    title: zod_1.z.string().max(200).nullish(),
    description: zod_1.z.string().max(5000).nullish(),
    date: zod_1.z.string().min(1, 'date requise').max(40),
    timeStart: zod_1.z.string().min(1, 'heure de début requise').max(20),
    timeEnd: zod_1.z.string().min(1, 'heure de fin requise').max(20),
    participantIds: strList.nullish(),
}).passthrough();
exports.appointmentUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().max(200).nullish(),
    description: zod_1.z.string().max(5000).nullish(),
    date: zod_1.z.string().max(40).optional(),
    timeStart: zod_1.z.string().max(20).optional(),
    timeEnd: zod_1.z.string().max(20).optional(),
    participantIds: strList.nullish(),
}).passthrough();
// ---- Réunion ----
exports.meetingMessageSchema = zod_1.z.object({ body: zod_1.z.string().min(1, 'message vide').max(5000) }).passthrough();
exports.meetingDelegatesSchema = zod_1.z.object({ userIds: strList.default([]) }).passthrough();
exports.meetingTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'titre requis').max(300),
    description: zod_1.z.string().max(5000).nullish(),
    assigneeId: zod_1.z.string().nullish(),
    statusKey: zod_1.z.string().max(40).nullish(),
    priority: priority.nullish(),
    transferable: zod_1.z.boolean().nullish(),
    due: zod_1.z.string().max(40).nullish(),
    messageId: zod_1.z.string().nullish(),
}).passthrough();
// ---- Sondages ----
exports.pollCreateSchema = zod_1.z.object({
    question: zod_1.z.string().min(1, 'question requise').max(300),
    options: zod_1.z.array(zod_1.z.string().max(200)).min(2, 'au moins 2 options requises'),
}).passthrough();
exports.pollVoteSchema = zod_1.z.object({}).passthrough();
// ---- Admin ----
exports.adminSetAdminSchema = zod_1.z.object({ admin: zod_1.z.boolean().nullish() }).passthrough();
exports.adminMailSendSchema = zod_1.z.object({
    to: zod_1.z.string().min(1, 'destinataire requis').max(200),
    subject: zod_1.z.string().min(1, 'objet requis').max(300),
    body: zod_1.z.string().max(20000).nullish(),
}).passthrough();
exports.adminMailReplySchema = zod_1.z.object({ body: zod_1.z.string().min(1, 'message vide').max(20000) }).passthrough();
exports.adminPrioritySchema = zod_1.z.object({ priority }).passthrough();
//# sourceMappingURL=schemas.js.map