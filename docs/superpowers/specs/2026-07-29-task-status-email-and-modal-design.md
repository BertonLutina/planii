# Task Status Email And Modal Design

## Goal

When a task status changes, the assigned person is notified by email. When a transferable task is transferred, both the sender and receiver get clear confirmation emails. On the home tasks screen, tasks are grouped by status and a task opens in a modal on a normal click, while a long press starts drag and drop without opening the modal.

## Backend Behavior

- A task status change sends an email to the current assignee.
- A transfer sends:
  - a received-transfer email to the new assignee;
  - a transfer-confirmed email to the actor who transferred it.
- Mail delivery uses the existing `sendMail` pipeline and respects `email_notifs`.
- Existing assignment mails remain in place for new task assignment and reassignment.
- In-app notifications and task event history continue to be recorded as they are today.

## Home Tasks UX

- The home task list groups the user's assigned tasks by status: `todo`, `in_progress`, `review`, `transferred`, `done`, plus any project status already returned by the API.
- Each visible group shows its label and count.
- A short click or tap on a task opens the task detail modal.
- A long press starts drag mode and prevents the modal from opening.
- Dragging a task to another status sends a `PATCH /tasks/:id` request with `statusKey`.
- Dropping on `transferred` requires an existing transfer target. If the task cannot be transferred safely from Home, the UI keeps the task in place and shows the existing backend error.

## Task Detail Modal

- `TaskDrawer` becomes a centered task detail modal for Home.
- The modal has a normal size and an expanded size.
- The expanded state is controlled by an explicit button in the modal header.
- The full task description is visible with preserved line breaks and internal scrolling.
- The modal keeps the existing completion toggle, project metadata, subtask summary, and open-project action.

## Testing

- Backend tests cover status-change and transfer email side effects through observable mail calls.
- Frontend build verifies the Home and modal changes compile.
- Existing task permission tests continue to pass.
