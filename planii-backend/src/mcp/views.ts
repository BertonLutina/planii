/** Vues compactes renvoyées aux assistants : uniquement ce qui est utile, jamais de ligne SQL brute. */

const cut = (v: unknown, n: number) => (typeof v === 'string' && v.length > n ? v.slice(0, n) + '…' : v ?? null)

export const taskOut = (t: Record<string, unknown>) => ({
  id: t.id,
  projectId: t.projectId ?? undefined,
  projectName: t.projectName ?? undefined,
  title: t.title,
  description: cut(t.description, 2000),
  type: t.type ?? null,
  assigneeId: t.assigneeId ?? null,
  createdBy: t.createdBy ?? undefined,
  due: t.due ?? null,
  done: t.done,
  priority: t.priority,
  statusKey: t.statusKey,
  estHours: t.estHours ?? null,
  spentHours: t.spentHours ?? null,
  parentId: t.parentId ?? null,
  transferable: t.transferable,
  commentCount: t.commentCount ?? 0,
})

export const todayCard = (c: Record<string, unknown>) => ({
  id: c.id, projectId: c.projectId, projectName: c.projectName, title: c.title,
  due: c.due, priority: c.priority, statusKey: c.statusKey, assigneeName: c.assigneeName,
})

export const projectRow = (p: Record<string, unknown>) => {
  const total = Number(p.taskCount) || 0
  const done = Number(p.doneCount) || 0
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    status: p.status,
    deadline: p.deadline ?? null,
    myRole: p.my_role,
    label: p.labelName ?? null,
    memberCount: Number(p.memberCount) || 0,
    taskCount: total,
    doneCount: done,
    progressPercent: total ? Math.round((done / total) * 100) : 0,
  }
}

export const appointmentOut = (a: Record<string, unknown>) => ({
  id: a.id,
  projectId: a.projectId,
  projectName: a.projectName,
  title: a.title,
  description: cut(a.description, 1000),
  date: a.date,
  timeStart: a.timeStart,
  timeEnd: a.timeEnd,
  participants: a.participants,
})
