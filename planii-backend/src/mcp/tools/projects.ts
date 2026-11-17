import { z } from 'zod'
import { tool } from '../tooling'
import * as ProjectService from '../../services/project.service'
import { projectRow } from '../views'

const id = z.string().min(1).max(64)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format AAAA-MM-JJ')

export const projectTools = [
  tool({
    name: 'planii_list_projects',
    title: 'Mes projets',
    description: 'Liste mes projets (ceux dont je suis membre) avec leur avancement (tâches terminées / total). Paginé : 20 par page par défaut, 50 max. Idéal pour « Montre-moi mes projets » ou « Analyse l’avancement de mes projets ».',
    scope: 'planii:read',
    input: {
      status: z.enum(['active', 'done', 'all']).default('active').describe('active = en cours, done = clôturés'),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(20),
    },
    handler: async (a, p) => {
      const r = (await ProjectService.listProjects(p.user.id, { status: a.status, page: a.page, limit: a.limit })) as Record<string, any>
      return { projects: r.items.map(projectRow), page: r.page, totalPages: r.totalPages, total: r.total, hasMore: r.hasMore, counts: r.counts }
    },
  }),
  tool({
    name: 'planii_get_project',
    title: 'Détail d’un projet',
    description: 'Détail d’un projet : membres (avec leurs ids, utiles pour assigner), colonnes de statut disponibles (clés à utiliser avec planii_set_task_status), échéance et avancement. Pour les tâches, utiliser planii_list_tasks.',
    scope: 'planii:read',
    input: { projectId: id },
    summarize: (a) => `projet ${a.projectId}`,
    handler: async (a, p) => {
      const { project, myRole } = await ProjectService.getProject(String(a.projectId), p.user.id)
      const d = project as Record<string, any>
      const total = Number(d.taskCount) || 0, done = Number(d.doneCount) || 0
      return {
        project: {
          id: d.id, name: d.name, type: d.type, status: d.status, deadline: d.deadline ?? null, closedAt: d.closedAt ?? null,
          myRole, taskCount: total, doneCount: done, progressPercent: total ? Math.round((done / total) * 100) : 0,
          statuses: (d.statuses || []).map((s: any) => ({ key: s.key, label: s.label })),
          members: (d.members || []).map((m: any) => ({ id: m.id, name: m.name, role: m.role, job: m.job || null })),
        },
      }
    },
  }),
  tool({
    name: 'planii_create_project',
    title: 'Créer un projet',
    description: 'Crée un projet dont je suis propriétaire. type : solo (1 prestataire + 1 client), team (équipe avec un leader) ou group (communauté, famille, amis).',
    scope: 'planii:write',
    input: { name: z.string().min(1).max(160), type: z.enum(['solo', 'team', 'group']), deadline: date.optional() },
    summarize: (a) => `créer projet « ${a.name} »`,
    handler: async (a, p) => {
      const { project } = await ProjectService.createProject(p.user.id, { name: String(a.name), type: String(a.type), deadline: (a.deadline as string) || null })
      return { project: { id: project.id, name: project.name, type: project.type, status: project.status, deadline: project.deadline ?? null } }
    },
  }),
  tool({
    name: 'planii_update_project',
    title: 'Modifier un projet',
    description: 'Renomme un projet ou change son échéance. Réservé au propriétaire du projet.',
    scope: 'planii:write',
    input: { projectId: id, name: z.string().min(1).max(160).optional(), deadline: date.nullable().optional().describe('null pour retirer l’échéance') },
    summarize: (a) => `modifier projet ${a.projectId}`,
    handler: async (a, p) => {
      const body: Record<string, unknown> = {}
      if (a.name !== undefined) body.name = a.name
      if (a.deadline !== undefined) body.deadline = a.deadline
      const pr = await ProjectService.updateProject(String(a.projectId), p.user.id, body)
      return { project: { id: pr!.id, name: pr!.name, deadline: pr!.deadline ?? null } }
    },
  }),
  tool({
    name: 'planii_close_project',
    title: 'Clôturer un projet',
    description: 'Clôture un projet terminé (réservé au propriétaire ou au leader). Réversible pendant 30 jours avec planii_reopen_project.',
    scope: 'planii:write',
    input: { projectId: id },
    summarize: (a) => `clôturer projet ${a.projectId}`,
    handler: async (a, p) => { await ProjectService.closeProject(String(a.projectId), p.user.id); return { ok: true } },
  }),
  tool({
    name: 'planii_reopen_project',
    title: 'Rouvrir un projet',
    description: 'Rouvre un projet clôturé il y a moins de 30 jours (propriétaire uniquement).',
    scope: 'planii:write',
    input: { projectId: id },
    summarize: (a) => `rouvrir projet ${a.projectId}`,
    handler: async (a, p) => { await ProjectService.reopenProject(String(a.projectId), p.user.id); return { ok: true } },
  }),
]
