# Task Spreadsheet Import — Design Spec

**Date:** 2026-07-25  
**Status:** Approved for planning  
**Scope:** Import tasks into a project from Excel-compatible files, CSV, clipboard tables, or public Google Sheets, via a multi-step wizard with three selection modes and bulk create.

---

## Problem

Users often keep task lists in spreadsheets. Planii only supports creating tasks one-by-one (`POST /projects/:id/tasks`). There is no file upload, no spreadsheet parsing, and no bulk create path. Importing many tasks is slow and error-prone.

## Goals

- Let a project member open an **Import** wizard from the project Tasks toolbar.
- Accept **upload**, **drag-and-drop**, **clipboard paste**, and **public Google Sheets URL**.
- Support **`.xlsx`**, **`.xls`**, **`.csv`** (and Google Sheets exported as CSV).
- Offer a **sheet picker** when multiple worksheets exist.
- Offer **three import modes** before selection:
  - **A** — Click a cell → task title; auto-detect date/priority in the same row when present.
  - **B** — Map columns (title required; date & priority optional) → select rows to import.
  - **C** — Click any cells → each selected cell becomes a title-only task.
- On **Import**: show a spinner, create tasks with a **bulk API**, then refresh the project task list.
- Persist `title` (required), `due` when present, `priority` when present, scoped to the current `project_id`.

## Non-goals (v1)

- Private Google Sheets / Google OAuth (deferred; public “Anyone with the link” only).
- Export from Planii to spreadsheet.
- Mapping assignees, descriptions, status, or other advanced fields (title / due / priority only).
- Server-side file storage of uploaded spreadsheets (parse client-side only).

---

## Architecture (Approach 1)

**Client parse + bulk API**

| Layer | Responsibility |
|--------|----------------|
| Frontend wizard | Source → sheet → mode → select → import; parse & preview |
| Client parsers | SheetJS for xlsx/xls/csv/clipboard; Google Sheets via public CSV export URL |
| Backend | `POST /projects/:id/tasks/bulk` — validate, create in one transaction |
| DB | Existing `tasks` table; no schema change |

```
[User] → Import button (Tasks tab)
      → TaskImportWizard
          → parse source → sheet list
          → mode A|B|C → selection → preview[]
          → POST /projects/:id/tasks/bulk
      → refresh GET /projects/:id/tasks → close wizard
```

---

## Wizard UX

**Entry point:** `ProjectDetail` → Tasks tab toolbar, next to “Nouvelle tâche” / dictate (only when project is not `done`).

**Steps:**

1. **Source** — File picker + drag-and-drop zone; paste area; Google Sheets URL field.
2. **Sheet** — Pick worksheet/tab. Skip automatically when CSV, paste, or single-sheet workbook.
3. **Mode** — Choose A, B, or C (short description under each option).
4. **Select** — Interactive grid + side preview of pending tasks.
5. **Import** — Confirm; spinner until bulk response; toast; refresh; close.

**Select step behavior:**

| Mode | Interaction | Task fields |
|------|-------------|-------------|
| A | Click cells | `title` = cell value; scan same row for date-like and priority-like values |
| B | Map columns, then toggle/select rows | Mapped `title` / `due` / `priority` per selected row |
| C | Click cells freely | `title` only per selected cell |

- Preview list shows pending tasks; empty titles are dropped before submit.
- Import disabled until ≥1 valid task.
- During import: spinner, controls disabled.

**UI patterns:** Reuse existing `Modal` / overlay from `planii-vite/src/lib/ui.tsx`, `busy` + toast patterns already used in ProjectDetail. i18n keys for FR + existing languages following current dictionary style.

---

## Data mapping

Align with existing task model (`tasks` table / `taskCreateSchema`):

| Spreadsheet | Task field | Rules |
|-------------|------------|--------|
| Title cell / column | `title` | Required; trim; skip if empty |
| Date cell / column | `due` | Normalize to `YYYY-MM-DD`; Excel serials + common string formats; omit if unparseable |
| Priority cell / column | `priority` | Integer 1–6; labels (e.g. high/medium/low) mapped to scale; omit → service default (6) |
| — | `project_id` | From route `:id` |
| — | `status_key` | Default `todo` (same as single create) |
| — | `created_by` | Current user (same as single create) |

**Mode A detection (same row):** Prefer cells that parse cleanly as date or priority; if multiple candidates, prefer nearest non-empty neighbors to the title cell; never overwrite title with a date/priority cell.

**Bulk payload item shape:**

```json
{ "title": "string", "due": "YYYY-MM-DD | null", "priority": 1 }
```

Optional `description` reserved but unused in v1 UI.

---

## API

### `POST /projects/:id/tasks/bulk`

**Auth / access:** Same as `POST /projects/:id/tasks` (JWT + project membership / owner checks).

**Request body (Zod):**

```ts
{
  tasks: Array<{
    title: string;           // min 1 after trim
    due?: string | null;     // YYYY-MM-DD
    priority?: number;       // clamp 1–6
    description?: string;
  }>
}
```

**Constraints:**
- Max **500** tasks per request.
- Empty `tasks` array → 400.
- Create all rows in a **single DB transaction**; on failure, roll back all.
- Reuse `TaskService` create logic (or shared internal helper) so defaults, clamping, and side effects stay consistent with single create.

**Response:** `{ tasks: TaskView[] }` — created tasks in order.

**Errors:**
- 401/403 — auth / project access
- 400 — validation, over limit, empty list
- 404 — project not found
- 500 — unexpected

No new migrations.

---

## Google Sheets (v1)

- User pastes a spreadsheet URL.
- Extract spreadsheet id (and optional `gid`).
- Fetch:  
  `https://docs.google.com/spreadsheets/d/{id}/export?format=csv&gid={gid}`  
  (default `gid=0` if absent).
- If fetch fails or returns HTML login/interstitial → error: sheet must be shared as “Anyone with the link”.
- Sheet picker applies to uploaded `.xlsx` / `.xls` with multiple worksheets. For Google Sheets, CSV, and paste: skip the Sheet step. Use the URL’s `gid` when present, otherwise `gid=0`. To import another tab from Google, the user pastes a URL that includes that tab’s `gid`.
- Private sheets / OAuth: **out of scope** for v1.

---

## Frontend modules (proposed)

| Module | Role |
|--------|------|
| `TaskImportWizard.tsx` | Wizard shell, steps, spinner, submit |
| `taskImportParse.ts` | File / paste / Google → sheets + grid matrix |
| `taskImportModes.ts` | Mode A/B/C selection → `ImportTaskDraft[]` |
| `taskImportNormalize.ts` | Date & priority normalization |
| `api.ts` | `bulkCreateTasks(projectId, tasks)` |
| `ProjectDetail.tsx` | Import button + open wizard + refresh on success |

**Dependencies:** add `xlsx` (SheetJS) to `planii-vite`.

---

## Backend modules (proposed)

| Module | Role |
|--------|------|
| `schemas.ts` | `taskBulkCreateSchema` |
| `tasks.routes.ts` | Register bulk route |
| `task.controller.ts` / `task.service.ts` | `createTasksBulk` in transaction |
| `Task.view.ts` | Map created rows (reuse existing view) |

---

## Error & edge cases

| Case | Behavior |
|------|----------|
| Unsupported / corrupt file | Stay on Source; clear error |
| Empty sheet | Block progress; message |
| Private Google Sheet | Clear message about public sharing |
| Unparseable date/priority | Omit field; keep title; preview reflects this |
| Empty titles | Dropped before API call |
| Bulk API failure | Toast; keep wizard state for retry |
| Over 500 selected | Cap or block with message before submit |
| Project `done` | Import button hidden (same as new task) |

---

## Success criteria

1. User can import from xlsx/xls/csv via upload or drag-and-drop.
2. User can paste a table and import.
3. User can import from a public Google Sheets URL.
4. Multi-sheet workbooks show a sheet picker.
5. Modes A, B, and C each produce correct drafts (title ± due ± priority as specified).
6. Import shows a spinner and creates all tasks via one bulk request.
7. After success, new tasks appear in the project Tasks list.
8. No schema migration; existing single-create behavior unchanged.

---

## Testing

- **Normalize unit tests:** date serials/strings → `YYYY-MM-DD`; priority numbers/labels → 1–6.
- **Mode unit tests:** A (row detection), B (column map + rows), C (cell titles).
- **API test:** bulk create happy path, empty list 400, over limit 400, transaction rollback on failure, auth denied.
- **Manual:** upload sample xlsx/csv, paste, public Sheet URL, each mode, verify Tasks tab refresh.

---

## Implementation order (for planning)

1. Backend bulk endpoint + tests  
2. Parse/normalize utilities + mode helpers  
3. Wizard UI (Source → Sheet → Mode → Select → Import)  
4. Wire button in ProjectDetail + i18n  
5. Manual verification with sample files  

---

## Open decisions resolved

| Decision | Choice |
|----------|--------|
| Selection model | All three modes (A/B/C) in wizard |
| Source methods | Upload + drag-drop + clipboard + public Google URL |
| Google auth | Public links only (v1); OAuth later |
| Multi-sheet | Sheet picker in wizard |
| Architecture | Client parse + bulk API |
| Bulk limit | 500 tasks / request |
