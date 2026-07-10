# Planii Vague 1 - Vers 9/10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first 9/10 wave: Today dashboard, task comments, task timeline, and anonymized admin views.

**Architecture:** Keep the current Express/Postgres API and React/Vite UI. Add focused tables and API routes in `planii-backend/server.js`, reuse existing `Home`, `ProjectDetail`, and `Admin` patterns, and keep advanced task details inside modals so the list stays readable.

**Tech Stack:** Node/Express, PostgreSQL via `pg`, React, TypeScript, Vite, existing CSS in `src/index.css`.

## Global Constraints

- Dashboard sections: dueToday, overdue, highPriority, transferred, review, activeDiscussions.
- Comments live on tasks, not in the main task list.
- Task history uses a dedicated task_events source, while project activity remains unchanged.
- Admin project/task routes return anonymized business content by default.
- No attachments, templates, advanced search, full client mode, full analytics, or full mobile redesign in this wave.
- Verification commands: `node --check server.js` and `npm run build`.

---

### Task 1: Backend Schema, Event Helper, Comments API

**Files:**
- Modify: `planii-backend/server.js`

**Interfaces:**
- Produces: `task_comments`, `task_events`, `recordTaskEvent(taskId, projectId, actorId, type, payload)`.
- Produces routes: `GET /api/tasks/:id/comments`, `POST /api/tasks/:id/comments`, `DELETE /api/task-comments/:id`, `GET /api/tasks/:id/events`.

- [ ] **Step 1: Add schema**

Add tables in `initSchema()`:

```js
await q(`CREATE TABLE IF NOT EXISTS task_comments (
  id text PRIMARY KEY, task_id text NOT NULL, project_id text NOT NULL, user_id text NOT NULL,
  body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);`);
await q(`CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments (task_id, created_at ASC);`);
await q(`CREATE TABLE IF NOT EXISTS task_events (
  id text PRIMARY KEY, task_id text NOT NULL, project_id text NOT NULL, actor_id text,
  type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now());`);
await q(`CREATE INDEX IF NOT EXISTS task_events_task_idx ON task_events (task_id, created_at ASC);`);
```

- [ ] **Step 2: Add helper**

Add:

```js
async function recordTaskEvent(taskId, projectId, actorId, type, payload = {}) {
  await q('INSERT INTO task_events (id,task_id,project_id,actor_id,type,payload) VALUES ($1,$2,$3,$4,$5,$6)',
    [uid(), taskId, projectId, actorId || null, type, JSON.stringify(payload || {})]);
}
```

- [ ] **Step 3: Add comments/events routes**

Implement member-checked routes returning `{ comments }` and `{ events }`. Comment deletion sets `deleted_at=now()` and requires author or project manager.

- [ ] **Step 4: Verification**

Run: `node --check server.js`
Expected: exit 0.

### Task 2: Backend Today API and Event Recording

**Files:**
- Modify: `planii-backend/server.js`

**Interfaces:**
- Produces route: `GET /api/today`.
- Consumes: `recordTaskEvent`.

- [ ] **Step 1: Add `/api/today`**

Return only projects where current user is a member. Each task card contains `id`, `projectId`, `projectName`, `title`, `assigneeId`, `assigneeName`, `due`, `done`, `priority`, `statusKey`, `transferredFrom`, `transferredTo`, `transferable`.

- [ ] **Step 2: Classify sections**

Use current local date string `YYYY-MM-DD`.

Rules:
- `dueToday`: task assigned to user, not done, due equals today.
- `overdue`: task assigned to user, not done, due before today.
- `highPriority`: task assigned to user, not done, priority 1 or 2.
- `transferred`: task where user is transferredFrom or transferredTo, not done.
- `review`: task assigned to user, not done, status `review`.
- `activeDiscussions`: projects with meeting messages in the last 7 days.

- [ ] **Step 3: Record task events on mutations**

Record events for task creation, done/ reopened, status change, transfer, task updated, priority changed, claimed, reminded, and comment added.

- [ ] **Step 4: Verification**

Run: `node --check server.js`
Expected: exit 0.

### Task 3: Frontend Types and Task Detail Comments/Timeline

**Files:**
- Modify: `planii-vite/src/lib/types.ts`
- Modify: `planii-vite/src/components/ProjectDetail.tsx`

**Interfaces:**
- Consumes comments/events routes from Task 1.
- Produces `TaskComments` and `TaskTimeline` UI inside the existing task edit modal.

- [ ] **Step 1: Add TypeScript interfaces**

Add `TaskComment` and `TaskEvent` types.

- [ ] **Step 2: Add task comments component**

Inside the task modal, show comments list, input, add button, and delete button for deletable comments.

- [ ] **Step 3: Add task timeline component**

Inside the task modal, show compact events with action label, actor name, date, and detail.

- [ ] **Step 4: Verification**

Run: `npm run build`
Expected: TypeScript and Vite build pass.

### Task 4: Frontend Today Dashboard

**Files:**
- Modify: `planii-vite/src/components/Home.tsx`
- Modify: `planii-vite/src/lib/types.ts`
- Modify: `planii-vite/src/index.css`

**Interfaces:**
- Consumes `GET /api/today`.

- [ ] **Step 1: Add today data types**

Create `TodayTask` and `TodayPayload` interfaces.

- [ ] **Step 2: Load `/api/today` in `Home`**

Fetch dashboard payload on mount and realtime updates. Keep existing list/board/agenda views available below or after the dashboard.

- [ ] **Step 3: Render sections**

Render sections for dueToday, overdue, highPriority, transferred, review, activeDiscussions with polished empty states.

- [ ] **Step 4: Mobile styling**

Add CSS so today sections stack on mobile and cards do not overflow.

- [ ] **Step 5: Verification**

Run: `npm run build`
Expected: TypeScript and Vite build pass.

### Task 5: Admin Anonymization

**Files:**
- Modify: `planii-backend/server.js`
- Modify: `planii-vite/src/components/Admin.tsx`

**Interfaces:**
- Produces anonymized `GET /api/admin/tasks` and `GET /api/admin/projects` response values.

- [ ] **Step 1: Add anonymizers**

Add helpers:

```js
const anonProject = (id) => `Projet #${String(id || '').slice(0, 6).toUpperCase()}`;
const anonTask = () => 'Tâche anonymisée';
const anonUser = (id) => `Utilisateur #${String(id || '').slice(0, 6).toUpperCase()}`;
const maskEmail = (email) => {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return '[masqué]';
  return `${name.slice(0, 1)}***@${domain}`;
};
```

- [ ] **Step 2: Apply to admin tasks/projects**

Replace project names, task titles, owner names, owner email, and assignee names in admin task/project list responses.

- [ ] **Step 3: Add UI badge**

Add `Données anonymisées` badge in Admin tasks/projects sections.

- [ ] **Step 4: Verification**

Run: `node --check server.js` and `npm run build`.
Expected: both pass.

### Task 6: Final Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run backend syntax check**

Run: `node --check server.js` from `planii-backend`.
Expected: exit 0.

- [ ] **Step 2: Run frontend build**

Run: `npm run build` from `planii-vite`.
Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Manual QA checklist**

Check:
- Today dashboard loads.
- Comments can be added and deleted.
- Timeline shows task events.
- Admin task/project lists show anonymized labels.
- Closed projects remain locked.
