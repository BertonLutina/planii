export const card = (t: Record<string, unknown>) => ({
  id: t.id,
  projectId: t.project_id,
  projectName: t.project_name,
  title: t.title,
  assigneeId: t.assignee_id || null,
  assigneeName: t.assignee_name || null,
  due: t.due || null,
  done: t.done,
  priority: t.priority == null ? 6 : Number(t.priority),
  statusKey: t.status_key || (t.done ? 'done' : 'todo'),
  transferable: t.transferable === true,
  transferredFrom: t.transferred_from || null,
  transferredFromName: t.transferred_from_name || null,
  transferredTo: t.transferred_to || null,
  transferredToName: t.transferred_to_name || null,
})

export const discussion = (r: Record<string, unknown>) => ({
  projectId: r.id,
  projectName: r.name,
  lastMessageAt: r.last_message_at,
  count: Number(r.count) || 0,
})

export const payload = (data: Record<string, unknown>) => ({ today: data })
