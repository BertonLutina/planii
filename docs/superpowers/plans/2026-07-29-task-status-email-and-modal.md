# Task Status Email And Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add task status email notifications, transfer confirmation emails, status-grouped Home tasks, and click-vs-long-press modal/drag behavior.

**Architecture:** Extend the existing task service mail side effects without adding a new notification subsystem. Reuse the existing Home task data shape and make `TaskDrawer` behave as a centered expandable modal.

**Tech Stack:** Node/Express, PostgreSQL, Vitest/Supertest, React/Vite, TypeScript, CSS.

## Global Constraints

- Preserve existing task permissions.
- Respect `email_notifs` for all new transactional emails.
- Normal click opens the modal.
- Long press starts drag and never opens the modal.
- No new frontend dependencies.

---

### Task 1: Backend Mail Side Effects

**Files:**
- Modify: `planii-backend/src/services/task.service.ts`
- Modify: `planii-backend/src/lib/mail-i18n.ts`
- Test: `planii-backend/tests/tasks.permissions.test.ts`

**Interfaces:**
- Consumes: existing `sendMail`, `mt`, `UserModel.findById`, `ProjectModel.findById`.
- Produces: task status and transfer update paths that send the new emails after the DB update succeeds.

- [ ] **Step 1: Write failing tests**

Add tests that spy on `sendMail` and verify:
- status update to `in_progress` emails the assignee;
- transfer to another member emails both the receiver and the transfer actor.

- [ ] **Step 2: Run the backend test file**

Run: `npm test -- tasks.permissions.test.ts`

Expected: FAIL because the new emails are not sent yet.

- [ ] **Step 3: Add mail keys and service helpers**

Add i18n keys for status changed, transfer received, and transfer confirmed. Add small helper functions in `task.service.ts` to load recipients and send the correct rows.

- [ ] **Step 4: Run the backend test file**

Run: `npm test -- tasks.permissions.test.ts`

Expected: PASS.

### Task 2: Home Status Groups And Long Press Drag

**Files:**
- Modify: `planii-vite/src/components/Home.tsx`
- Modify: `planii-vite/src/index.css`

**Interfaces:**
- Consumes: existing `Task.statusKey`, `Project.statuses`, `api('PATCH', '/tasks/:id', ...)`.
- Produces: Home list grouped by status with drag/drop status updates.

- [ ] **Step 1: Implement status grouping**

Build status sections from the user's project statuses plus fallbacks, group `mine` tasks by `statusKey`, and render each section with task count.

- [ ] **Step 2: Implement click vs long press**

Use pointer events with a timer:
- `pointerdown` starts a timer;
- if it reaches the long-press threshold, set drag state;
- `pointerup` before threshold opens the modal;
- dragged tasks can drop onto another status group.

- [ ] **Step 3: Build frontend**

Run: `npm run build`

Expected: PASS.

### Task 3: Expandable Task Modal

**Files:**
- Modify: `planii-vite/src/components/TaskDrawer.tsx`
- Modify: `planii-vite/src/index.css`

**Interfaces:**
- Consumes: existing `TaskDrawer` props.
- Produces: centered modal with expandable layout and preserved task detail controls.

- [ ] **Step 1: Convert drawer markup to modal semantics**

Keep the exported component name for existing imports, but render a centered `role="dialog"` panel with an expand button and close button.

- [ ] **Step 2: Add modal CSS**

Style `.drawer` as a centered modal, add `.drawer.expanded`, and make description/subcontent scroll cleanly.

- [ ] **Step 3: Build frontend**

Run: `npm run build`

Expected: PASS.

## Self-Review

- Spec coverage: backend emails, status groups, click modal, long press drag, and expandable detail modal are all mapped to tasks.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: uses existing `Task`, `Project`, `statusKey`, and `TaskDrawer` interfaces.
