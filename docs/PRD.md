# Product Requirements — Mini Task Manager

## 1. Background

An internal team manages simple tasks. Three problems keep coming up:

1. A task's status changes, but nobody can tell who changed it or what exactly changed.
2. Changes are hard to trace afterwards.
3. The UI does not show the history of a task.

## 2. Goal

A small task manager in which every status change is **attributable** (who), **traceable** (from what, to what, when) and **visible** (shown per task in the UI).

Success is judged by clarity and consistency, not by the number of features.

## 3. Users

Members of one internal team. There is no login. The person using the app picks who they are acting as from a predefined user list, and that name is recorded as the actor of each status change.

## 4. Scope

| In scope | Out of scope |
|---|---|
| Create, list and delete tasks | Authentication, authorization, roles |
| Move a task through the fixed status flow | Editing a task's title or description |
| Record every status change in an audit log | Assignees, due dates, comments, attachments |
| Show the audit log per task | Search, filtering, pagination |
| Choose the acting user from a dropdown | Real-time updates between browsers |

## 5. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | A user can create a task with a required `title` and an optional `description`. A new task starts in `to_do`. |
| FR-2 | A user can see all tasks, each with its title, description, current status and created/updated time. |
| FR-3 | A user can change a task's status, but only one step forward along `to_do` → `pending` → `in_progress` → `done`. |
| FR-4 | A user can delete a task. |
| FR-5 | Every status change creates one audit log entry holding `taskId`, `actor`, `fromStatus`, `toStatus` and `timestamp`. |
| FR-6 | A user can open the audit log of a task and read it in chronological order. |
| FR-7 | A user chooses the actor from a predefined list in the UI. |

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Idempotent update** — setting a task to the status it already has creates no audit log entry. |
| NFR-2 | **Data consistency** — a task's status and its audit log are always in sync: a status change without its log entry (or the reverse) must be impossible. |
| NFR-3 | **Immutability** — an audit log entry can never be changed or deleted, including when its task is deleted. |
| NFR-4 | **Domain validation** — the backend rejects any status change that breaks the flow. Frontend validation is an extra, never the only check. |
| NFR-5 | **Persistence** — data survives a server restart. |
| NFR-6 | **No overengineering** — no auth, no heavy UI framework, nothing the requirements do not ask for. |

## 7. Data

**Task** — `id`, `title`, `description` (nullable), `status`, `createdAt`, `updatedAt`.

**Audit log entry** — `id`, `taskId`, `actor`, `fromStatus`, `toStatus`, `timestamp`.

An entry reads as a sentence, for example:

> User "john.doe" changed Task "Prepare Invoice" status from "pending" to "in_progress" at 2025-01-01 10:00

## 8. Acceptance criteria

- Creating a task shows it in the list with status `to_do`.
- From any status, exactly one move is offered and accepted: the next step. `done` offers none.
- Skipping a step, going backwards, or leaving `done` is rejected by the backend with a clear message, and nothing changes.
- After each accepted move, the task's history shows one more entry with the correct actor, statuses and time.
- Sending the current status again succeeds and adds no entry.
- Deleting a task removes it from the list; its audit log entries still exist.
- No request, of any kind, can change or remove an audit log entry.

How each of these is verified is recorded in [VALIDATION.md](VALIDATION.md).
