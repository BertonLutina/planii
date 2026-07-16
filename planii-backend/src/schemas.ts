import { z } from 'zod'

/** Schémas de validation des bodies. Principe : défensif mais non cassant.
 *  - .passthrough() : les champs non listés sont conservés tels quels.
 *  - .nullish() : champ optionnel ET nullable (le front envoie souvent null).
 *  - pas de coercition de type qui modifierait ce que reçoit le service. */

const priority = z.number().int().min(0).max(10)
const strList = z.array(z.string())
const numOrStr = z.union([z.string(), z.number()])

// ---- Auth ----
export const registerSchema = z.object({
  name: z.string().min(1, 'nom requis').max(120),
  email: z.string().min(3, 'email requis').max(200),
  password: z.string().min(1, 'mot de passe requis').max(200),
  job: z.string().max(60).nullish(),
}).passthrough()

export const loginSchema = z.object({
  email: z.string().min(1, 'email requis').max(200),
  password: z.string().min(1, 'mot de passe requis').max(200),
}).passthrough()

// ---- Me / profil ----
export const meUpdateSchema = z.object({
  firstName: z.string().max(120).nullish(),
  lastName: z.string().max(120).nullish(),
  job: z.string().max(60).nullish(),
  taskTypes: z.array(z.any()).nullish(),
  roleLibrary: z.array(z.any()).nullish(),
}).passthrough()

export const projectLabelSchema = z.object({
  label: z.string().min(1, 'libellé requis').max(60),
  color: z.string().max(40).nullish(),
}).passthrough()

export const labelColorsSchema = z.object({}).passthrough()

// ---- Projets ----
export const projectCreateSchema = z.object({
  name: z.string().min(1, 'nom du projet requis').max(160),
  type: z.string().max(20).nullish(),
  labelId: z.string().max(80).nullish(),
  deadline: z.string().max(40).nullish(),
}).passthrough()

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  deadline: z.string().max(40).nullish(),
  labelId: z.string().max(80).nullish(),
}).passthrough()

export const idsSchema = z.object({ ids: strList.default([]) }).passthrough()
export const roleNameSchema = z.object({ name: z.string().min(1, 'nom du rôle requis').max(80) }).passthrough()
export const memberRolesSchema = z.object({ roleIds: strList.default([]) }).passthrough()
export const taskStatusSchema = z.object({
  label: z.string().max(60).nullish(),
  name: z.string().max(60).nullish(),
  color: z.string().max(40).nullish(),
}).passthrough()

// ---- Tâches ----
export const taskCreateSchema = z.object({
  title: z.string().min(1, 'titre requis').max(300),
  description: z.string().max(5000).nullish(),
  type: z.string().max(40).nullish(),
  assigneeId: z.string().nullish(),
  due: z.string().max(40).nullish(),
  estHours: numOrStr.nullish(),
  priority: priority.nullish(),
  transferable: z.boolean().nullish(),
  statusKey: z.string().max(40).nullish(),
  parentId: z.string().nullish(),
}).passthrough()

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullish(),
  type: z.string().max(40).nullish(),
  assigneeId: z.string().nullish(),
  due: z.string().max(40).nullish(),
  estHours: numOrStr.nullish(),
  priority: priority.nullish(),
  transferable: z.boolean().nullish(),
  statusKey: z.string().max(40).nullish(),
  transferredTo: z.string().nullish(),
  done: z.boolean().nullish(),
}).passthrough()

export const commentSchema = z.object({ body: z.string().min(1, 'commentaire vide').max(5000) }).passthrough()

// ---- Invitations ----
export const inviteCreateSchema = z.object({
  role: z.string().max(80).nullish(),
  email: z.string().max(200).nullish(),
}).passthrough()

// ---- Rendez-vous ----
export const appointmentCreateSchema = z.object({
  title: z.string().max(200).nullish(),
  description: z.string().max(5000).nullish(),
  date: z.string().min(1, 'date requise').max(40),
  timeStart: z.string().min(1, 'heure de début requise').max(20),
  timeEnd: z.string().min(1, 'heure de fin requise').max(20),
  participantIds: strList.nullish(),
}).passthrough()

export const appointmentUpdateSchema = z.object({
  title: z.string().max(200).nullish(),
  description: z.string().max(5000).nullish(),
  date: z.string().max(40).optional(),
  timeStart: z.string().max(20).optional(),
  timeEnd: z.string().max(20).optional(),
  participantIds: strList.nullish(),
}).passthrough()

// ---- Réunion ----
export const meetingMessageSchema = z.object({ body: z.string().min(1, 'message vide').max(5000) }).passthrough()
export const meetingDelegatesSchema = z.object({ userIds: strList.default([]) }).passthrough()
export const meetingTaskSchema = z.object({
  title: z.string().min(1, 'titre requis').max(300),
  description: z.string().max(5000).nullish(),
  assigneeId: z.string().nullish(),
  statusKey: z.string().max(40).nullish(),
  priority: priority.nullish(),
  transferable: z.boolean().nullish(),
  due: z.string().max(40).nullish(),
  messageId: z.string().nullish(),
}).passthrough()

// ---- Sondages ----
export const pollCreateSchema = z.object({
  question: z.string().min(1, 'question requise').max(300),
  options: z.array(z.string().max(200)).min(2, 'au moins 2 options requises'),
}).passthrough()
export const pollVoteSchema = z.object({}).passthrough()

// ---- Admin ----
export const adminSetAdminSchema = z.object({ admin: z.boolean().nullish() }).passthrough()
export const adminMailSendSchema = z.object({
  to: z.string().min(1, 'destinataire requis').max(200),
  subject: z.string().min(1, 'objet requis').max(300),
  body: z.string().max(20000).nullish(),
}).passthrough()
export const adminMailReplySchema = z.object({ body: z.string().min(1, 'message vide').max(20000) }).passthrough()
export const adminPrioritySchema = z.object({ priority }).passthrough()
