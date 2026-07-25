# Task Spreadsheet Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project Tasks import wizard (upload / drag-drop / paste / public Google Sheets) with modes A/B/C and bulk task creation.

**Architecture:** Parse spreadsheets client-side (SheetJS + Google public CSV export). Selection builds `{ title, due?, priority? }[]`. Backend `POST /projects/:id/tasks/bulk` creates up to 500 tasks in one transaction, reusing single-create defaults.

**Tech Stack:** Express + Zod + PostgreSQL (`planii-backend`), React + Vite + TypeScript + SheetJS (`planii-vite`), existing `Modal` / `api` / i18n.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-task-spreadsheet-import-design.md`
- Formats: `.xlsx`, `.xls`, `.csv`; clipboard table; public Google Sheets URL only
- Modes A (cell + row date/priority), B (column map + rows), C (cells = titles)
- Sheet picker for multi-sheet xlsx/xls only; Google uses URL `gid` or `0`
- Bulk max 500; `due` = `YYYY-MM-DD`; `priority` 1–6
- No schema migration; no private Google OAuth
- Verify: `cd planii-backend && npm test` (bulk tests); `cd planii-vite && npm run build`

## File structure

| File | Responsibility |
|------|----------------|
| `planii-backend/src/schemas.ts` | `taskBulkCreateSchema` |
| `planii-backend/src/services/task.service.ts` | `createTasksBulk` |
| `planii-backend/src/controllers/Task.controller.ts` | `createBulk` |
| `planii-backend/src/routes/tasks.routes.ts` | Register bulk route |
| `planii-backend/src/views/Task.view.ts` | `bulkCreated` |
| `planii-backend/tests/tasks.bulk.test.ts` | Bulk API tests |
| `planii-vite/package.json` | Add `xlsx` |
| `planii-vite/src/lib/taskImportNormalize.ts` | Date/priority normalize |
| `planii-vite/src/lib/taskImportParse.ts` | File/paste/Google → sheets |
| `planii-vite/src/lib/taskImportModes.ts` | Modes A/B/C → drafts |
| `planii-vite/src/components/TaskImportWizard.tsx` | Wizard UI |
| `planii-vite/src/components/ProjectDetail.tsx` | Import button |
| `planii-vite/src/lib/api.ts` | (reuse `api()`; no change required if wizard calls it) |
| i18n dictionaries under `planii-vite/src` | Import strings |

---

### Task 1: Backend bulk create API

**Files:**
- Modify: `planii-backend/src/schemas.ts`
- Modify: `planii-backend/src/services/task.service.ts`
- Modify: `planii-backend/src/controllers/Task.controller.ts`
- Modify: `planii-backend/src/routes/tasks.routes.ts`
- Modify: `planii-backend/src/views/Task.view.ts`
- Create: `planii-backend/tests/tasks.bulk.test.ts`

**Interfaces:**
- Produces: `POST /api/projects/:id/tasks/bulk` with body `{ tasks: [{ title, due?, priority?, description? }] }`
- Produces: `{ tasks: TaskView[] }`
- Consumes: existing membership / `assertProjectOpen` / `prioOrDefault` / `uid` / activity logging patterns from `createTask`

- [ ] **Step 1: Add schema**

```ts
export const taskBulkCreateSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1).max(300),
    description: z.string().max(5000).nullish(),
    due: z.string().max(40).nullish(),
    priority: priority.nullish(),
  }).passthrough()).min(1).max(500),
}).passthrough()
```

- [ ] **Step 2: Add `createTasksBulk` in task.service.ts**

Validate project + membership + open. Begin transaction. For each item: trim title (skip empty), insert row like `createTask` (defaults: status `todo`, no assignee, priority via `prioOrDefault`), `recordTaskEvent` + `logActivity` per task (or one summary activity + per-task events). Commit. Return array of created task objects matching `createTask` return shape. Cap already enforced by Zod.

- [ ] **Step 3: Controller + view + route**

```ts
// Task.view.ts
export const bulkCreated = (tasks: Record<string, unknown>[]) => ({ tasks })

// Task.controller.ts
export const createBulk = [auth, asyncHandler(async (req, res) => {
  const tasks = await TaskService.createTasksBulk(req.params.id, req.user!, req.body.tasks)
  res.json(TaskView.bulkCreated(tasks))
})]

// tasks.routes.ts — register BEFORE or alongside single create
r.post('/projects/:id/tasks/bulk', validate(taskBulkCreateSchema), ...TaskController.createBulk)
```

- [ ] **Step 4: Write tests in `tests/tasks.bulk.test.ts`**

Happy path: member posts 2 tasks → 200, body.tasks length 2, rows in DB. Empty array → 400. 501 items → 400. Non-member → 403.

- [ ] **Step 5: Run tests**

Run: `cd planii-backend && npm test -- tests/tasks.bulk.test.ts`
Expected: PASS (or skip if DB unavailable, same as existing tests)

---

### Task 2: Client normalize + parse + modes

**Files:**
- Create: `planii-vite/src/lib/taskImportNormalize.ts`
- Create: `planii-vite/src/lib/taskImportParse.ts`
- Create: `planii-vite/src/lib/taskImportModes.ts`
- Modify: `planii-vite/package.json` (add `xlsx`)

**Interfaces:**
- Produces:
  - `normalizeDue(value: unknown): string | null`
  - `normalizePriority(value: unknown): number | null`
  - `parseWorkbook(buffer: ArrayBuffer): { name: string; rows: string[][] }[]`
  - `parseCsvText(text: string): { name: string; rows: string[][] }[]`
  - `fetchPublicGoogleSheet(url: string): Promise<{ name: string; rows: string[][] }[]>`
  - `extractGoogleSheetIds(url: string): { id: string; gid: string } | null`
  - `draftsFromModeA(rows, r, c): ImportTaskDraft`
  - `draftsFromModeB(rows, mapping, selectedRowIndexes): ImportTaskDraft[]`
  - `draftsFromModeC(rows, cells: {r,c}[]): ImportTaskDraft[]`
  - `type ImportTaskDraft = { title: string; due: string | null; priority: number | null }`

- [ ] **Step 1: `npm install xlsx` in planii-vite**

- [ ] **Step 2: Implement normalize**

- Excel serial numbers → UTC date → `YYYY-MM-DD`
- Strings: ISO, `DD/MM/YYYY`, `MM/DD/YYYY` (prefer day-first when ambiguous for EU users)
- Priority: ints 1–6; words `high`/`haute`→1, `medium`/`moyenne`→3, `low`/`basse`→5; null if unknown

- [ ] **Step 3: Implement parse**

- SheetJS `read` → each sheet to `string[][]` via `sheet_to_json({ header: 1, defval: '' })`
- Paste: detect TSV/CSV
- Google: regex extract id/gid; fetch export CSV; throw friendly error on failure

- [ ] **Step 4: Implement modes**

- A: title = cell; scan row for first date-like and first priority-like cell ≠ title cell
- B: mapping `{ titleCol, dueCol?, priorityCol? }`; one draft per selected row
- C: one draft per selected cell (title only)

---

### Task 3: TaskImportWizard UI

**Files:**
- Create: `planii-vite/src/components/TaskImportWizard.tsx`
- Modify: i18n files used by `tt()` (same pattern as `pd.*` keys)

**Interfaces:**
- Consumes: parse/mode helpers; `api('POST', `/projects/${id}/tasks/bulk`, { tasks })`
- Produces: `<TaskImportWizard projectId onClose onImported />`

- [ ] **Step 1: Wizard shell with steps Source → Sheet → Mode → Select → (import)**

Reuse `Modal`. Source: file input accept `.xlsx,.xls,.csv`, drag-drop, textarea paste, Google URL + Load. Sheet: radio list if `sheets.length > 1`. Mode: three cards A/B/C. Select: scrollable grid of cells; highlight selection; side list of drafts. Import button → spinner (`busy`) → bulk POST → `onImported(count)` / toast.

- [ ] **Step 2: Wire mode interactions**

- A/C: click cell toggles selection
- B: column dropdowns + click row header or checkbox to select rows

- [ ] **Step 3: i18n keys** for button, steps, modes, errors, success (FR primary + EN fallback pattern of the repo)

---

### Task 4: Wire into ProjectDetail

**Files:**
- Modify: `planii-vite/src/components/ProjectDetail.tsx` (TasksTab toolbar ~448)

- [ ] **Step 1: Add Import button + state**

Next to Nouvelle tâche / dictate when `p.status !== 'done'`. Open wizard; onImported → `reload()` + toast.

- [ ] **Step 2: Build frontend**

Run: `cd planii-vite && npm run build`
Expected: exit 0

---

### Task 5: Manual smoke checklist

- [ ] Upload sample CSV with title/date/priority columns — mode B
- [ ] Mode A click titles with date in row
- [ ] Mode C multi-cell
- [ ] Drag-drop xlsx
- [ ] Paste TSV
- [ ] Public Google URL (or error if private)
- [ ] Tasks appear in project after import

---

## Spec coverage

| Spec requirement | Task |
|------------------|------|
| Upload / drag-drop / paste / public Google | 2, 3 |
| Sheet picker multi-xlsx | 3 |
| Modes A/B/C | 2, 3 |
| Bulk + spinner | 1, 3 |
| due / priority mapping | 2 |
| Refresh Tasks tab | 4 |
| 500 cap / public Google only | 1, 2 |
