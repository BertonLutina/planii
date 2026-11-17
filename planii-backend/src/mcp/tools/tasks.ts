import { z } from 'zod'
import { tool } from '../tooling'
import * as ProjectService from '../../services/project.service'
import * as TaskService from '../../services/task.service'
import { taskOut } from '../views'

const id = z.string().min(1).max(64)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format AAAA-MM-JJ')
const priority = z.number().int().min(1).max(6).describe('1 = la plus urgente, 6 = la moins urgente')

/** Ne garde que les clés fournies : le service distingue « absent » de « null » (qui efface la valeur). */
const pick = (a: Record<string, unknown>, keys: string[]) => {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (a[k] !== undefined) out[k] = a[k]
  return out
}

export const taskTools = [
  tool({
    name: 'planii_list_my_tasks',
    title: 'Mes tâches',
    description: 'Tâches dont je suis le responsable, tous projets confondus (projets clos exclus), triées par priorité puis échéance. Idéal pour « Quelles sont mes tâches ? ».',
    scope: 'planii:read',
    input: { done: z.boolean().optional().describe('true = terminées, false = à faire, absent = toutes'), limit: z.number().int().min(1).max(100).default(30) },
    handler: async (a, p) => {
      const tasks = await TaskService.listMyAssignedTasks(p.user.id, { done: a.done as boolean | undefined, limit: a.limit as number })
      return { tasks: tasks.map((t) => taskOut(t as Record<string, unknown>)) }
    },
  }),
  tool({
    name: 'planii_list_tasks',
    title: 'Tâches d’un projet',
    description: 'Tâches d’un projet, filtrables par statut, responsable ou état. Paginé (20 par page, 50 max).',
    scope: 'planii:read',
    input: {
      projectId: id,
      statusKey: z.string().max(40).optional().describe('Clé de statut (voir planii_get_project), ex. todo, in_progress, done'),
      assigneeId: id.optional(),
      done: z.boolean().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(20),
    },
    summarize: (a) => `tâches du projet ${a.projectId}`,
    handler: async (a, p) => {
      const q: Record<string, unknown> = { page: a.page, limit: a.limit }
      if (a.statusKey) q.statusKey = a.statusKey
      if (a.assigneeId) q.assigneeId = a.assigneeId
      if (a.done !== undefined) q.done = String(a.done)
      const r = await ProjectService.listProjectTasks(String(a.projectId), p.user.id, q)
      return { tasks: r.items.map((t) => taskOut(t as Record<string, unknown>)), page: r.page, totalPages: r.totalPages, total: r.total, hasMore: r.hasMore }
    },
  }),
  tool({
    name: 'planii_get_task',
    title: 'Détail d’une tâche',
    description: 'Détail d’une tâche avec ses commentaires et son historique.',
    scope: 'planii:read',
    input: { taskId: id },
    summarize: (a) => `tâche ${a.taskId}`,
    handler: async (a, p) => {
      const { task, project, myRole } = await TaskService.getTask(String(a.taskId), p.user.id)
      const comments = (await TaskService.listComments(String(a.taskId), p.user.id)) as unknown as Array<Record<string, unknown>>
      const events = (await TaskService.listEvents(String(a.taskId), p.user.id)) as unknown as Array<Record<string, unknown>>
      return {
        task: taskOut({ ...task, projectId: project.id, projectName: project.name }), myRole,
        comments: comments.slice(-30).map((c) => ({ id: c.id, userName: c.userName, body: c.body, at: c.at })),
        history: events.slice(-30).map((e) => ({ type: e.type, actorName: e.actorName, at: e.at })),
      }
    },
  }),
  tool({
    name: 'planii_create_task',
    title: 'Créer une tâche',
    description: 'Crée une tâche dans un projet. Pour « une tâche pour demain », calculer la date AAAA-MM-JJ de demain. Sans responsable, la tâche reste « à prendre ». Utiliser planii_get_me pour m’assigner la tâche.',
    scope: 'planii:write',
    input: {
      projectId: id,
      title: z.string().min(1).max(300),
      description: z.string().max(5000).optional(),
      assigneeId: id.optional().describe('id d’un membre du projet (voir planii_get_project)'),
      due: date.optional(),
      priority: priority.optional(),
      statusKey: z.string().max(40).optional(),
      estHours: z.number().min(0).max(10000).optional(),
      parentId: id.optional().describe('id de la tâche parente pour créer une sous-tâche'),
    },
    summarize: (a) => `créer tâche « ${a.title} » (projet ${a.projectId})`,
    handler: async (a, p) => {
      const t = await TaskService.createTask(String(a.projectId), p.user, pick(a, ['title', 'description', 'assigneeId', 'due', 'priority', 'statusKey', 'estHours', 'parentId']))
      return { task: taskOut({ ...t, projectId: a.projectId }) }
    },
  }),
  tool({
    name: 'planii_create_tasks_bulk',
    title: 'Créer plusieurs tâches',
    description: 'Crée jusqu’à 50 tâches d’un coup dans un projet (par exemple pour transformer un plan, une checklist ou une feuille de travail en tâches).',
    scope: 'planii:write',
    input: {
      projectId: id,
      tasks: z.array(z.object({
        title: z.string().min(1).max(300), description: z.string().max(5000).optional(), due: date.optional(), priority: priority.optional(),
      })).min(1).max(50),
    },
    summarize: (a) => `créer ${(a.tasks as unknown[]).length} tâches (projet ${a.projectId})`,
    handler: async (a, p) => {
      const tasks = await TaskService.createTasksBulk(String(a.projectId), p.user, a.tasks as Array<Record<string, unknown>>)
      return { created: tasks.length, tasks: (tasks as unknown as Array<Record<string, unknown>>).map((t) => taskOut({ ...t, projectId: a.projectId })) }
    },
  }),
  tool({
    name: 'planii_update_task',
    title: 'Modifier une tâche',
    description: 'Modifie titre, description, responsable, échéance, priorité ou heures estimées. Les droits de Planii s’appliquent : titre/description/échéance/responsable = créateur ou propriétaire ; priorité = responsable, créateur ou propriétaire. Passer null pour effacer une échéance ou un responsable. Pour changer le statut, utiliser planii_set_task_status.',
    scope: 'planii:write',
    input: {
      taskId: id,
      title: z.string().min(1).max(300).optional(),
      description: z.string().max(5000).nullable().optional(),
      assigneeId: id.nullable().optional(),
      due: date.nullable().optional(),
      priority: priority.optional(),
      estHours: z.number().min(0).max(10000).nullable().optional(),
    },
    summarize: (a) => `modifier tâche ${a.taskId}`,
    handler: async (a, p) => {
      const body = pick(a, ['title', 'description', 'assigneeId', 'due', 'priority', 'estHours'])
      if (!Object.keys(body).length) return { error: 'Rien à modifier : précisez au moins un champ.' }
      await TaskService.updateTask(String(a.taskId), p.user, body)
      const { task } = await TaskService.getTask(String(a.taskId), p.user.id)
      return { task: taskOut(task as Record<string, unknown>) }
    },
  }),
  tool({
    name: 'planii_set_task_status',
    title: 'Changer le statut d’une tâche',
    description: 'Déplace une tâche vers une autre colonne de statut (clé issue de planii_get_project, ex. todo, in_progress, review, done). Réservé au responsable, au créateur ou au propriétaire. « transferred » exige transferredTo (membre du projet) et une tâche marquée transférable.',
    scope: 'planii:write',
    input: { taskId: id, statusKey: z.string().min(1).max(40), transferredTo: id.optional() },
    summarize: (a) => `statut ${a.statusKey} → tâche ${a.taskId}`,
    handler: async (a, p) => {
      await TaskService.updateTask(String(a.taskId), p.user, pick(a, ['statusKey', 'transferredTo']))
      const { task } = await TaskService.getTask(String(a.taskId), p.user.id)
      return { task: taskOut(task as Record<string, unknown>) }
    },
  }),
  tool({
    name: 'planii_complete_task',
    title: 'Terminer une tâche',
    description: 'Coche une tâche comme terminée (ou la rouvre avec done=false). Règle Planii : seul le responsable de la tâche peut la cocher. Conseil : ajouter ensuite un commentaire avec planii_add_task_comment pour résumer le résultat.',
    scope: 'planii:write',
    input: { taskId: id, done: z.boolean().default(true) },
    summarize: (a) => `${a.done === false ? 'rouvrir' : 'terminer'} tâche ${a.taskId}`,
    handler: async (a, p) => {
      await TaskService.updateTask(String(a.taskId), p.user, { done: a.done !== false })
      const { task } = await TaskService.getTask(String(a.taskId), p.user.id)
      return { task: taskOut(task as Record<string, unknown>) }
    },
  }),
  tool({
    name: 'planii_claim_task',
    title: 'Prendre une tâche',
    description: 'Me prend une tâche « à prendre » (sans responsable).',
    scope: 'planii:write',
    input: { taskId: id },
    summarize: (a) => `prendre tâche ${a.taskId}`,
    handler: async (a, p) => { await TaskService.claimTask(String(a.taskId), p.user.id); return { ok: true } },
  }),
  tool({
    name: 'planii_add_task_comment',
    title: 'Commenter une tâche',
    description: 'Ajoute un commentaire à une tâche (visible par toute l’équipe du projet). Utile pour déposer un résultat, un résumé de travail ou un lien vers un livrable.',
    scope: 'planii:write',
    input: { taskId: id, body: z.string().min(1).max(5000) },
    summarize: (a) => `commenter tâche ${a.taskId}`,
    handler: async (a, p) => {
      const r = (await TaskService.addComment(String(a.taskId), p.user, String(a.body))) as unknown as Record<string, unknown>
      return { comment: { id: r.id, body: r.body, at: r.at } }
    },
  }),
  tool({
    name: 'planii_delete_task',
    title: 'Supprimer une tâche',
    description: 'SUPPRIME définitivement une tâche et ses sous-tâches (réservé au créateur ou au propriétaire). Irréversible. Premier appel sans confirm : renvoie un récapitulatif à montrer à l’utilisateur. Ne rappeler avec confirm=true qu’après son accord explicite.',
    scope: 'planii:delete',
    input: { taskId: id, confirm: z.boolean().default(false) },
    summarize: (a) => `supprimer tâche ${a.taskId}${a.confirm === true ? '' : ' (en attente de confirmation)'}`,
    handler: async (a, p) => {
      const { task, project } = await TaskService.getTask(String(a.taskId), p.user.id)
      if (a.confirm !== true) {
        return { needsConfirmation: true, message: `Demandez à l’utilisateur de confirmer la suppression définitive de la tâche « ${task.title} » du projet « ${project.name} », puis rappelez cet outil avec confirm=true.` }
      }
      await TaskService.deleteTask(String(a.taskId), p.user.id)
      return { deleted: true, title: task.title }
    },
  }),
]
