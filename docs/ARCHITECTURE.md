# Architecture

## 1. Overview

```
 Browser                              Node.js process                          Disk
┌─────────────────────────┐  /api   ┌───────────────────────────────────┐   ┌────────────┐
│ React (Vite)            │ ──────▶ │ Express                           │   │ SQLite     │
│                         │  JSON   │                                   │   │            │
│ features/               │ ◀────── │ features/                         │   │ tasks      │
│   tasks                 │         │   tasks       routes → service ─┐ │   │ audit_logs │
│   audit-logs            │         │   audit-logs  routes → service ─┼─┼──▶│            │
│   actors                │         │   actors      routes → service ─┘ │   │            │
│                         │         │                    → repository   │   │            │
└─────────────────────────┘         └───────────────────────────────────┘   └────────────┘
```

Two projects, installed and started together through one npm workspace:

| Project | Role |
|---|---|
| `backend/` | Express API. Owns the data and enforces every rule. |
| `frontend/` | React single-page app. Shows the data and offers the valid actions. |

The two projects share no code. What they must agree on is kept as mirrored files — see [Keeping the two sides consistent](#keeping-the-two-sides-consistent).

In development the browser only talks to the Vite dev server, which proxies `/api` to Express, so no CORS setup is needed.

## 2. Feature architecture

Both projects are organised **by feature first, by layer second**. The same three features exist on both sides, with the same names:

| Feature | What it owns |
|---|---|
| `tasks` | Creating, listing, editing and deleting tasks, and moving them through the status flow |
| `audit-logs` | Recording and reading the history of everything done to a task |
| `actors` | The predefined user list and who the viewer is acting as |

Everything about one feature sits in one folder, and every feature folder has the same shape. To work on audit logs you open `features/audit-logs/` on either side and find the whole thing.

### Backend: routes → service → repository

Each feature folder under `backend/src/features/` has the same three files:

| Layer | File | Responsibility | Knows about |
|---|---|---|---|
| Routes | `<feature>.routes.ts` | HTTP: validate the request shape, call the service, set the status code | Express |
| Service | `<feature>.service.ts` | The rules of the feature. This is its public interface to other features | Neither HTTP nor SQL |
| Repository | `<feature>.repository.ts` | Where the data comes from: SQL and row ↔ object mapping | SQLite |

A feature that sends its own data shape over HTTP also has a `<feature>.types.ts` (`tasks`, `audit-logs`). `tasks` has one more file, `task.schemas.ts`, holding the zod schemas its routes validate with.

### Frontend: components → hook → api

Each feature folder under `frontend/src/features/` mirrors that:

| Layer | File | Responsibility | Backend counterpart |
|---|---|---|---|
| Components | `components/*.tsx` | Render and forward what the user did | Routes — the entry point |
| Hook | `use<Feature>.ts` | State and actions of the feature | Service — the logic |
| API | `<feature>.api.ts` | One typed function per endpoint | Repository — where data comes from |

### Dependencies between features

```
actors        (depends on nothing)
audit-logs    (depends on nothing)
tasks    ──▶  audit-logs, actors
```

- Dependencies inside a feature point one way: routes → service → repository, and components → hook → api.
- **Only `tasks` depends on other features**, and it talks to them through their **service**, never their repository. Every write in `TaskService` calls `ActorService.assertKnownActor()` and `AuditLogService.record()`.
- The same holds in the frontend: `TaskItem` embeds the `AuditLogPanel` of the audit-logs feature. The selected actor is passed in from `App.tsx`, so `tasks` does not import from `actors` at all.
- `app.ts` (backend) and `App.tsx` (frontend) are the **composition roots**: the only places that know how the features fit together.

### What is not a feature

| Folder | Contents |
|---|---|
| `backend/src/core/` | Config, database connection and schema, the status flow, typed errors, error handler, body validation helper |
| `frontend/src/core/` | The `fetch` wrapper, the status flow, status labels, date formatting |
| `frontend/src/components/` | UI used by more than one feature (`StatusBadge`) |

Features may import from `core/`. `core/` never imports from a feature. The status flow sits in `core/` for that reason: the database schema, `tasks` and `audit-logs` all need it.

### Keeping the two sides consistent

There is no shared package. The parts of the contract that both projects need exist twice, as files with the **same path and the same content** in each project:

| What | Backend | Frontend |
|---|---|---|
| Status flow: the statuses, `getNextStatus`, `canTransition` | `src/core/task-status.ts` | `src/core/task-status.ts` — identical file |
| Task shapes: `Task`, `TaskInput`, `UpdateTaskStatusRequest` | `src/features/tasks/task.types.ts` | `src/features/tasks/task.types.ts` — identical file |
| Audit log shapes: `AuditLog`, `AuditAction`, `AuditField` | `src/features/audit-logs/audit-log.types.ts` | `src/features/audit-logs/audit-log.types.ts` — identical file |
| Error shape: `ApiErrorCode`, `ApiErrorResponse` | in `src/core/errors.ts` | in `src/core/http.ts` |

A change to the contract means editing the file on one side and copying it to the other. The backend is always the authority: if the copies drifted, the frontend might offer a move the backend then rejects with `409`, but no invalid data could be written.

## 3. Life of a write

Every write — create, edit, status change, delete — follows the same path. Taking a status change as the example:

`PATCH /api/tasks/:id/status` with header `X-Actor: john.doe` and body `{ "status": "in_progress" }`

1. **`task.routes.ts`** — zod checks the shape of the body (`status` is one of the four statuses), and the acting user is read from the `X-Actor` header. A malformed body is a `400 VALIDATION_ERROR`.
2. **`task.service.ts`** — asks `ActorService` whether the actor is on the predefined list (`400` if not), then opens a transaction and inside it:
   1. loads the task through `TaskRepository` → `404 TASK_NOT_FOUND` if missing or deleted;
   2. if the task already has that status → returns it unchanged (**idempotent**, no log);
   3. if the status is not the next step → `409 INVALID_TRANSITION`;
   4. updates the task's `status` and `updated_at` through `TaskRepository`;
   5. calls `AuditLogService.record()` with the same timestamp, which inserts through `AuditLogRepository`.
3. **Commit** — both writes are committed together. If anything throws, both are rolled back.
4. **Response** — the updated task. The frontend's `useTasks` replaces its copy with it, and an open history panel reloads because the task's `updatedAt` changed.

The other writes differ only in step 2:

| Write | What happens inside the transaction | Audit entries |
|---|---|---|
| Create | Insert the task | One `created` |
| Edit | Compare title and description with the stored task; update if anything differs | One `updated` per changed field; none if nothing changed |
| Status change | Check the flow; update the status | One `status_changed`; none if the status is the same |
| Delete | Mark the task as deleted | One `deleted` |

The two writes go through two different features, so the transaction cannot live in either repository. `core/database.ts` provides a `runInTransaction` function that `app.ts` hands to `TaskService`; the service can say "these belong together" without touching SQL.

## 4. Data model

```sql
tasks
  id          TEXT PRIMARY KEY           -- UUID
  title       TEXT NOT NULL
  description TEXT
  status      TEXT NOT NULL  CHECK (status IN ('to_do','pending','in_progress','done'))
  created_at  TEXT NOT NULL              -- ISO 8601, UTC
  updated_at  TEXT NOT NULL
  deleted_at  TEXT                       -- set = soft-deleted

audit_logs                               -- one row = one thing one actor did to one task
  id          INTEGER PRIMARY KEY AUTOINCREMENT   -- also the chronological order
  task_id     TEXT NOT NULL REFERENCES tasks(id)
  task_title  TEXT NOT NULL              -- the title the task had at that moment
  actor       TEXT NOT NULL
  action      TEXT NOT NULL  CHECK (action IN ('created','updated','status_changed','deleted'))
  field       TEXT           CHECK (field IN ('title','description','status'))   -- for a change
  from_value  TEXT                       -- for a change: value before
  to_value    TEXT                       -- for a change: value after
  timestamp   TEXT NOT NULL

TRIGGER audit_logs_block_update  BEFORE UPDATE ON audit_logs → RAISE(ABORT)
TRIGGER audit_logs_block_delete  BEFORE DELETE ON audit_logs → RAISE(ABORT)
```

How the brief's audit log maps onto this: a status change is a row with `action = 'status_changed'`, `field = 'status'`, and the two statuses in `from_value` → `to_value`, next to `task_id`, `actor` and `timestamp`.

The schema is created on startup by `backend/src/core/database.ts`. There is no migration tool: a database file created by an older version of the schema has to be deleted. The status list in the `CHECK` constraint is generated from `core/task-status.ts`, so it cannot drift from the code. Actors have no table: the list is a constant in `actor.repository.ts`.

## 5. API

Base path `/api`. Bodies are JSON. Timestamps are ISO 8601 strings in UTC.

**Every write must carry an `X-Actor` header** naming the acting user. It stands in for a login: with real authentication the same information would come from the session.

| Method | Path | Feature | `X-Actor` | Body | Success | Errors |
|---|---|---|---|---|---|---|
| `GET` | `/actors` | actors | — | — | `200` `string[]` | — |
| `GET` | `/tasks` | tasks | — | — | `200` `Task[]`, newest first | — |
| `POST` | `/tasks` | tasks | required | `{ title, description? }` | `201` `Task` | `400` |
| `PUT` | `/tasks/:id` | tasks | required | `{ title, description? }` | `200` `Task` | `400`, `404` |
| `PATCH` | `/tasks/:id/status` | tasks | required | `{ status }` | `200` `Task` | `400`, `404`, `409` |
| `DELETE` | `/tasks/:id` | tasks | required | — | `204` | `400`, `404` |
| `GET` | `/tasks/:id/audit-logs` | audit-logs | — | — | `200` `AuditLog[]`, oldest first | `404` |
| `GET` | `/audit-logs` | audit-logs | — | — | `200` `AuditLog[]` of all tasks, oldest first | — |

The per-task history route is nested under a task in the URL, so the task router mounts that part of the audit-log router: it checks that the task exists (deleted ones included), then hands over.

Every error has the same shape:

```json
{ "error": { "code": "INVALID_TRANSITION", "message": "Cannot change status from \"to_do\" to \"done\": the only allowed next status is \"pending\"" } }
```

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Malformed body, missing title, unknown status, missing or unknown actor |
| 404 | `TASK_NOT_FOUND` | No such task, or it was deleted |
| 404 | `NOT_FOUND` | No such route |
| 409 | `INVALID_TRANSITION` | Well-formed request that conflicts with the task's current status |
| 500 | `INTERNAL_ERROR` | Anything unexpected |

The exact TypeScript shapes are in each feature's `*.types.ts`: [`task.types.ts`](../backend/src/features/tasks/task.types.ts) and [`audit-log.types.ts`](../backend/src/features/audit-logs/audit-log.types.ts).

## 6. Key decisions

**Same features, same shape, on both sides.** A feature folder always contains the same layers, and the frontend's features match the backend's by name. Finding code is a matter of knowing the feature and the layer.

**One rule, mirrored.** `getNextStatus` and `canTransition` live in `core/task-status.ts`, an identical file in both projects. The backend validates with it and is the authority; the frontend's copy only decides which button to show.

**The client sends the target status, not "advance".** `PATCH { status: "pending" }` states the desired end state, which makes idempotency natural: sending it twice, or two people sending it at once, ends in the same state with one log entry. An "advance" action sent twice would move the task two steps.

**One audit log for everything.** Create, edit, status change and delete all write the same kind of row: who, which task, which action, and for a change which field went from what to what. Reading a history never needs a second table, and adding a new kind of action needs no new structure.

**Each entry stands on its own.** An entry stores the title the task had at that moment. The history of all tasks stays readable after a task is renamed or deleted, and shows what the task was called when the action was taken.

**The actor travels in a header, not in the body.** Every write needs to know who is acting, including a delete, which has no body. One `X-Actor` header covers them all and keeps request bodies about the task only. It is also where real authentication would plug in.

**A change and its log entry are one transaction.** The read, the rule check and all writes run inside a single `BEGIN IMMEDIATE` transaction. There is no moment where a task has changed and the log has not.

**Immutability is enforced by the database, not by convention.** Two triggers reject `UPDATE` and `DELETE` on `audit_logs` no matter what code issues them. On top of that, the audit-logs feature is read-and-append only at every layer: its repository has `insert`, `findAll` and `findByTaskId`, its service has `record`, `listAll` and `listForTask`, and its routers answer only `GET`.

**Deleting a task is a soft delete.** The row stays with `deleted_at` set, so the foreign key from `audit_logs` always points at something and the history is preserved. A task that has log entries cannot be physically removed: the foreign key blocks it.

**Frontend treats the server as the source of truth.** After a change it stores what the server returned. When the server rejects a change (for example, the screen was stale), it shows the server's message and reloads the list.

Visual rules are described in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). The full file listing is in [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).
