export const created = (task: Record<string, unknown>) => ({ task })

export const fromRow = (t: Record<string, unknown>) => ({
  id: t.id,
  title: t.title,
  description: t.description || null,
  type: t.type || null,
  assigneeId: t.assignee_id,
  createdBy: t.created_by,
  due: t.due,
  done: t.done,
  doneAt: t.done_at,
  estHours: t.est_hours == null ? null : Number(t.est_hours),
  spentHours: t.spent_hours == null ? null : Number(t.spent_hours),
  priority: t.priority == null ? 6 : Number(t.priority),
  parentId: t.parent_id || null,
  position: t.position == null ? null : Number(t.position),
  statusKey: t.status_key || (t.done ? 'done' : 'todo'),
  transferable: t.transferable === true,
  transferredFrom: t.transferred_from || null,
  transferredTo: t.transferred_to || null,
  transferHistory: t.transferHistory || [],
  commentCount: t.commentCount || 0,
})

export const meetingCreated = (task: Record<string, unknown>) => ({ task })

export const comment = (c: Record<string, unknown>) => ({
  id: c.id,
  taskId: c.task_id,
  projectId: c.project_id,
  userId: c.user_id,
  userName: c.user_name,
  body: c.deleted_at ? '[commentaire supprimé]' : c.body,
  deleted: !!c.deleted_at,
  canDelete: c.canDelete,
  at: c.created_at,
})

export const commentCreated = (c: Record<string, unknown>) => ({ comment: c })

export const comments = (items: unknown[]) => ({ comments: items })

export const event = (e: Record<string, unknown>) => ({
  id: e.id,
  taskId: e.task_id,
  projectId: e.project_id,
  actorId: e.actor_id || null,
  actorName: e.actor_name || 'Planii',
  type: e.type,
  payload: e.payload || {},
  at: e.created_at,
})

export const events = (items: unknown[]) => ({ events: items })

export const mine = (projects: unknown[]) => ({ projects })
