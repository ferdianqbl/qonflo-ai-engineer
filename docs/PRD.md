# Product Requirements — Mini Task Manager

## 1. Background

An internal team manages simple tasks. Three problems keep coming up:

1. A task's status changes, but nobody can tell who changed it or what exactly changed.
2. Changes are hard to trace afterwards.
3. The UI does not show the history of a task.

## 2. Goal

A small task manager in which every change to a task is **attributable** (who), **traceable** (what changed, from what to what, when) and **visible** (shown in the UI, per task and across all tasks).

Success is judged by clarity and consistency, not by the number of features.

## 3. Users

Members of one internal team. There is no login. The person using the app picks who they are acting as from a predefined user list, and that name is recorded as the actor of everything they do.

## 4. Scope

| In scope | Out of scope |
|---|---|
| Create, list, edit and delete tasks | Authentication, authorization, roles |
| Move a task through the fixed status flow | Assignees, due dates, comments, attachments |
| Record every create, edit, status change and delete in an audit log | Search, filtering, pagination |
| Show the history of one task, and of all tasks together | Real-time updates between browsers |
| Choose the acting user from a dropdown | Restoring a deleted task |

## 5. Functional requirements

FR-1 to FR-7 come from the brief. FR-8 to FR-10 extend it in the same direction: more of what happens to a task is traceable.

| ID | Requirement |
|---|---|
| FR-1 | A user can create a task with a required `title` and an optional `description`. A new task starts in `to_do`. |
| FR-2 | A user can see all tasks, each with its title, description, current status and created/updated time. |
| FR-3 | A user can change a task's status, but only one step forward along `to_do` → `pending` → `in_progress` → `done`. |
| FR-4 | A user can delete a task. |
| FR-5 | Every status change creates one audit log entry that tells which task, who, from which status to which status, and when. |
| FR-6 | A user can open the history of a task and read it in chronological order. |
| FR-7 | A user chooses the actor from a predefined list in the UI. |
| FR-8 | A user can edit a task's title and description. |
| FR-9 | Creating, editing and deleting a task are recorded in the audit log too. An edit records each changed field with its value before and after. |
| FR-10 | A user can see the history of all tasks in one place, in chronological order, including tasks that have been deleted. |

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Idempotent update** — setting a task to the status it already has, or saving an edit that changes nothing, creates no audit log entry. |
| NFR-2 | **Data consistency** — a task and its audit log are always in sync: a change without its log entry (or the reverse) must be impossible. |
| NFR-3 | **Immutability** — an audit log entry can never be changed or deleted, including when its task is deleted. |
| NFR-4 | **Domain validation** — the backend rejects any status change that breaks the flow. Frontend validation is an extra, never the only check. |
| NFR-5 | **Persistence** — data survives a server restart. |
| NFR-6 | **No overengineering** — no auth, no heavy UI framework, nothing the requirements do not ask for. |

## 7. Data

**Task** — `id`, `title`, `description` (nullable), `status`, `createdAt`, `updatedAt`.

**Audit log entry** — one thing one actor did to one task:

| Field | Meaning |
|---|---|
| `id` | Sequence number; also the chronological order |
| `taskId` | Which task |
| `taskTitle` | The task's title at that moment |
| `actor` | Who |
| `action` | `created`, `updated`, `status_changed` or `deleted` |
| `field` | For a change: which field — `title`, `description` or `status` |
| `fromValue` → `toValue` | For a change: the value before and after. For a status change these are the two statuses |
| `timestamp` | When |

An entry reads as a sentence, for example:

> User "john.doe" changed Task "Prepare Invoice" status from "pending" to "in_progress" at 2025-01-01 10:00

## 8. Acceptance criteria

- Creating a task shows it in the list with status `to_do`, and its history starts with "created".
- From any status, exactly one move is offered and accepted: the next step. `done` offers none.
- Skipping a step, going backwards, or leaving `done` is rejected by the backend with a clear message, and nothing changes.
- After each accepted status change, the task's history shows one more entry with the correct actor, statuses and time.
- Editing a task adds one entry per changed field, showing the old and the new value. Saving without changes adds nothing.
- Sending the current status again succeeds and adds no entry.
- Deleting a task removes it from the list and adds a "deleted" entry. All its earlier entries still exist.
- The history of all tasks shows the entries of every task, deleted ones included, oldest first.
- A write without a known acting user is rejected.
- No request, of any kind, can change or remove an audit log entry.

How each of these is verified is recorded in [VALIDATION.md](VALIDATION.md).
