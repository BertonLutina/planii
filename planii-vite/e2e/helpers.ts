import type { BrowserContext, Page } from '@playwright/test'

export const USERS: Record<string, { id: string; name: string; email: string; firstName: string; lastName: string }> = {
  'token-alice': { id: 'u1', name: 'Alice Private', email: 'alice@example.test', firstName: 'Alice', lastName: 'Private' },
  'token-bob': { id: 'u2', name: 'Bob Other', email: 'bob@example.test', firstName: 'Bob', lastName: 'Other' },
}

const tasks = [
  { id: 't1', title: 'Rédiger le cahier des charges', description: 'Première version', type: 'Tâche', assigneeId: 'u1', createdBy: 'u1', due: '2026-09-25', done: false, priority: 2, statusKey: 'todo', position: 0, commentCount: 0 },
  { id: 't2', title: 'Valider la maquette', assigneeId: null, createdBy: 'u1', due: null, done: false, priority: 4, statusKey: 'in_progress', position: 1, commentCount: 1 },
  { id: 't3', title: 'Livrer le site', assigneeId: 'u1', createdBy: 'u1', due: '2026-09-01', done: true, priority: 3, statusKey: 'done', position: 2, commentCount: 0 },
]
const summary = { id: 'p1', name: 'Site vitrine', type: 'team', status: 'active', deadline: '2026-10-15', owner_id: 'u1', my_role: 'owner', memberCount: 2, labelId: null, labelName: 'Travail', labelColor: '#c2710c', imageUrl: null, taskCount: 3, doneCount: 1, totalPoints: 0, position: 0 }
const summary2 = { ...summary, id: 'p2', name: 'Application mobile', position: 1, taskCount: 0, doneCount: 0 }
const project = {
  ...summary,
  members: [{ id: 'u1', name: 'Alice Private', email: 'alice@example.test', role: 'owner' }, { id: 'u2', name: 'Bob Other', email: 'bob@example.test', role: 'member' }],
  tasks, polls: [], appointments: [], activity: [], roles: [],
  statuses: [
    { id: 'todo', key: 'todo', label: 'À faire', color: '#9a988f', position: 0, fixed: true },
    { id: 'in_progress', key: 'in_progress', label: 'En cours', color: '#3b82d6', position: 1, fixed: true },
    { id: 'done', key: 'done', label: 'Terminé', color: '#4caf50', position: 99, fixed: true },
  ],
}
const page = (items: unknown[]) => ({ items, page: 1, limit: 100, total: items.length, totalPages: 1, hasMore: false })

export async function mockApi(context: BrowserContext) {
  await context.route('https://api.planii.app/**', async (route) => {
    const token = (route.request().headers()['authorization'] || '').replace('Bearer ', '')
    const user = USERS[token]
    const path = new URL(route.request().url()).pathname
    if (!user) return route.fulfill({ status: 401, json: { error: 'unauthorized' } })
    if (path.endsWith('/me')) return route.fulfill({ json: { user } })
    if (path.endsWith('/projects/p1')) return route.fulfill({ json: { project } })
    if (path.endsWith('/projects/p1/tasks')) return route.fulfill({ json: page(tasks) })
    if (path.endsWith('/tasks/mine')) return route.fulfill({ json: { projects: [{ ...project, tasks: tasks.filter((t) => t.assigneeId === 'u1') }] } })
    if (path.endsWith('/api/projects') && !route.request().url().includes('page=')) return route.fulfill({ json: { projects: [summary, summary2] } })
    if (path.endsWith('/api/projects')) return route.fulfill({ json: { ...page([summary, summary2]), counts: { active: 2, done: 0 } } })
    if (/\/tasks\/t\d+\/(comments|events)$/.test(path)) return route.fulfill({ json: { comments: [], events: [] } })
    // Empty but well-shaped payloads for everything else the shell asks for.
    return route.fulfill({
      json: { projects: [], labels: [], colors: [], notifications: [], unread: 0, events: [], messages: [], userIds: [], items: [], page: 1, limit: 30, total: 0, totalPages: 1, hasMore: false, counts: { active: 0, done: 0 },
        today: { dueToday: [], overdue: [], highPriority: [], transferred: [], review: [], activeDiscussions: [] } },
    })
  })
}

export async function signIn(page: Page, token: string) {
  await page.goto('/')
  await page.evaluate((t) => localStorage.setItem('planii.token', t), token)
  await page.reload()
}

