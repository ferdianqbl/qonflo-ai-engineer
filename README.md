# Mini Task Manager

A small task manager for an internal team in which everything done to a task is recorded: **who** did **what** to **which task** — created it, edited it, moved it **from one status to another**, deleted it — and **when**. The audit log cannot be edited or deleted.

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Storage:** SQLite (a single file, no setup)

## Documentation

| Document | Contents |
|---|---|
| [docs/PRD.md](docs/PRD.md) | What is being built and why; requirements and acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, data model, API reference, key decisions |
| [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) | Every folder and file, and where new code goes |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Colours, typography, components and states of the UI |
| [docs/VALIDATION.md](docs/VALIDATION.md) | How each requirement was verified, and what was not |

---

## Getting started

**Requirement:** Node.js 22.12 or newer (developed on Node.js 24) with npm.

```bash
npm install
```

```bash
npm run dev
```

This starts both projects:

| | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |

The database file is created automatically at `backend/data/tasks.db` on first run. Delete that folder to start from an empty state. If you ran an earlier version of this project, delete it once: there is no migration, and the history table has changed.

> Recent npm versions print an `install-scripts` notice during `npm install`. It can be ignored: the app does not rely on those scripts.

### Running the two projects separately

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

### Other commands

| Command | What it does |
|---|---|
| `npm test` | Runs the backend test suite (31 tests, in-memory database) |
| `npm run typecheck` | Type-checks `backend` and `frontend` |
| `npm run build` | Production build of the frontend |

### Configuration

Both are optional environment variables.

| Variable | Default | Purpose |
|---|---|---|
| `API_PORT` | `3001` | Port of the Express server (the Vite proxy follows it) |
| `DATABASE_PATH` | `backend/data/tasks.db` | Location of the SQLite file |

### Trying the backend validation directly

The UI only offers the one valid next status, so an invalid transition has to be sent by hand. Every write names the acting user in an `X-Actor` header:

```bash
curl -s -X POST http://localhost:3001/api/tasks -H 'Content-Type: application/json' -H 'X-Actor: john.doe' -d '{"title":"Prepare Invoice"}'
```

```bash
curl -s -X PATCH http://localhost:3001/api/tasks/<id>/status -H 'Content-Type: application/json' -H 'X-Actor: john.doe' -d '{"status":"done"}'
```

The second call answers `409` with `INVALID_TRANSITION`, because `to_do` can only move to `pending`. Leaving the header out answers `400`.

---

## Architecture in short

Both projects are organised **by feature**, and the same three features exist on both sides:

```
                 frontend/src/features/            backend/src/features/
tasks            components → hook → api   ──▶     routes → service → repository   ──▶  SQLite
audit-logs       components → hook → api   ──▶     routes → service → repository   ──▶  SQLite
actors           components → hook → api   ──▶     routes → service → repository
```

- **Every backend feature has the same three files.** `*.routes.ts` validates the request and shapes the response. `*.service.ts` holds the rules. `*.repository.ts` holds the data access.
- **Every frontend feature mirrors that.** `components/` render, `use*.ts` holds state and actions, `*.api.ts` calls the backend.
- **Only `tasks` depends on other features**, and only through their service: every write asks `actors` whether the actor is known and tells `audit-logs` to record what was done.
- **The contract is mirrored, not shared.** The status flow (`core/task-status.ts`) and the request/response types (`*.types.ts` in each feature) exist in both projects as identical files under the same path. The backend validates with `canTransition` and is the authority; the frontend uses `getNextStatus` from its copy only to decide which button to show.

More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md).

### API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create a task — `{ title, description? }` |
| `PUT` | `/api/tasks/:id` | Edit a task — `{ title, description? }` |
| `PATCH` | `/api/tasks/:id/status` | Change status — `{ status }` |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/tasks/:id/audit-logs` | History of one task, oldest first |
| `GET` | `/api/audit-logs` | History of all tasks, oldest first, deleted tasks included |
| `GET` | `/api/actors` | The predefined user list for the dropdown |

The four writes (`POST`, `PUT`, `PATCH`, `DELETE`) require an `X-Actor` header with a name from the user list. It stands in for a login.

Errors always look like `{ "error": { "code": "...", "message": "..." } }` — `400` for invalid input or a missing actor, `404` for an unknown task, `409` for a transition that breaks the flow.

### The audit log

One entry is one thing one actor did to one task:

| Field | Meaning |
|---|---|
| `taskId`, `taskTitle` | Which task, and what it was called at that moment |
| `actor` | Who |
| `action` | `created`, `updated`, `status_changed` or `deleted` |
| `field`, `fromValue`, `toValue` | For a change: which field went from what to what |
| `timestamp` | When |

The audit log the brief asks for is the `status_changed` entry: `field` is `status`, and `fromValue` → `toValue` are the status before and after. Editing a task writes one `updated` entry per changed field. Creating and deleting write one entry each.

### How the non-functional requirements are met

| Requirement | How |
|---|---|
| Idempotent update | If the requested status equals the current one, the service returns the task untouched before any write happens. The same holds for an edit that changes nothing. |
| Data consistency | For every write, the read, the rule check, the change and the log insert run in one database transaction. If the log cannot be written, the change is rolled back. |
| Immutable audit log | Database triggers reject every `UPDATE` and `DELETE` on `audit_logs`. The `audit-logs` feature can only insert and read, at every layer: repository, service and routes. |
| Domain validation | Enforced in the backend service. The frontend has a copy of the rule only to choose which button to show. |
| Persistence | SQLite file on disk. |

---

## Assumptions

1. **"Strict order" means exactly one step forward.** No skipping, no going back, and `done` is final.
2. **A new task always starts in `to_do`.**
3. **Sending the current status again is a success, not an error.** It returns `200` with the unchanged task, and `updatedAt` does not move. Saving an edit that changes nothing behaves the same way.
4. **Traceability covers more than status.** The brief requires an audit entry for every status change. Creating, editing and deleting a task are recorded as well, because "who changed what" matters for those too.
5. **Only title and description can be edited.** Status changes only through its own endpoint, where the flow is enforced. A finished task can still be edited.
6. **Delete is a soft delete.** The task leaves the list, but its row and its whole history stay. The history gains a "deleted" entry and remains visible in the History tab. A deleted task cannot be restored.
7. **The actor is trusted.** With no authentication, the backend only checks that the name in the `X-Actor` header is on the predefined list (`backend/src/features/actors/actor.repository.ts`).
8. **"Chronological" means oldest first**, for the history of one task and for the history of all tasks.
9. **One backend instance** is running against the database file.

## Trade-offs

| Decision | Gained | Given up |
|---|---|---|
| **SQLite** with a synchronous driver (`better-sqlite3`) | No setup for the reviewer; real transactions, constraints and triggers | One writer at a time, and every query blocks the Node.js event loop while it runs |
| **Status flow and API types duplicated** in both projects as mirrored files, with no shared package | Each project stands on its own; nothing extra to build or explain | The two copies are kept in sync by hand. If they drifted, the backend would still reject a wrong move with `409`, but the compiler would not catch it |
| **Backend runs with `tsx`**, no compile step | Simple to start and to read | The backend has no compiled production build |
| **Client sends the target status** (`{ status: "pending" }`) rather than "advance" | Repeating a request, or two people clicking at once, cannot move a task twice | The client has to know the next status (it has its own copy of the flow rule) |
| **Soft delete** | The log always points at an existing task; history survives | Rows are never removed; a deleted task appears only in the History tab and cannot be restored |
| **One generic audit entry** (`action`, `field`, `fromValue`, `toValue`) for every kind of change | One table and one list cover create, edit, status change and delete | A status change has no dedicated `fromStatus`/`toStatus` columns; the two values are stored as text and typed by the `field` next to them |
| **The title is copied into each audit entry** | An entry stays readable after the task is renamed or deleted | The same title is stored many times |
| **Actor in an `X-Actor` header** rather than in each body | One rule for all four writes, including `DELETE`, which has no body | A caller has to know about the header; it is trust-based, like the dropdown itself |
| **Editing is last-write-wins** | Simple: no version numbers | Two people editing the same task at once: the second save overwrites the first. Both edits are in the history, but nobody is warned |
| **Plain React hooks**, no data-fetching library | Few dependencies; every line of state handling is visible | No caching, no optimistic updates, manual loading and error state |
| **Plain CSS**, no UI framework | Small and readable | Fewer ready-made components |
| **UI offers only the valid next step** | The user cannot make an invalid move by accident | Backend rejection is only visible through the API or a stale screen |

## With more time

- **Frontend tests** — component tests for `TaskItem` and `AuditLogPanel`, and one end-to-end test of the main flow.
- **Real authentication**, so the actor comes from the session and not from a header the client fills in.
- **Filter and paginate the history** — by task, actor or action. It currently returns everything.
- **Detect conflicting edits** with a version number on the task, so a save based on outdated data is rejected.
- **Keep screens fresh** — polling or server-sent events, so a user does not act on an outdated status.
- **Restore a deleted task**, recorded as its own history entry.
- **Database migrations**, so a schema change does not require deleting the database file.
- **Generate the frontend's API types from the backend** (for example from an OpenAPI description), so the contract is not maintained by hand in two places.
- **PostgreSQL**, a compiled backend build, a Dockerfile and CI.
- **ESLint and Prettier** configuration.

---

## Evaluation questions

### 1. Bagaimana kamu memastikan audit log tidak ter-modifikasi?

With several layers, so that no single mistake can break it:

1. **The database refuses.** Two triggers (`audit_logs_block_update`, `audit_logs_block_delete` in `backend/src/core/database.ts`) abort any `UPDATE` or `DELETE` on `audit_logs`, whatever code sends it.
2. **Deleting a task cannot take its log with it.** Tasks are soft-deleted. The foreign key has no cascade, so a task that has log entries cannot be physically removed at all.
3. **There is no code path.** The `audit-logs` feature is insert-and-read only at every layer: `audit-log.repository.ts` has `insert`, `findAll` and `findByTaskId`; the service has `record`, `listAll` and `listForTask`; the routers answer only `GET`.
4. **Tests hold it in place.** They try `UPDATE` and `DELETE` directly on the database, try `PUT`/`POST`/`DELETE` on the log routes, and delete a task and read its history afterwards.
5. **Each entry stands on its own.** It stores the task's title as it was, so renaming or deleting the task later cannot change what an old entry says.

The limit of this: someone with direct access to the database file could drop the triggers. Going further would mean a database user that only has `INSERT` and `SELECT` on the table, and a hash chain (each entry stores the hash of the previous one) so that tampering becomes detectable.

### 2. Bagian mana dari solusi ini yang paling berisiko jika digunakan oleh banyak user?

**The persistence layer.** SQLite allows one writer at a time, and `better-sqlite3` is synchronous, so each query blocks the single Node.js thread. With many users, every request waits behind the others, and a second backend instance cannot be added because the database is a local file.

Related risks:

- **Two people changing the status of the same task at once.** This is handled for correctness: the read, the check and both writes are one transaction, so there is never a double move or a missing log. The second identical request becomes a no-op, and a conflicting one gets `409`. One consequence to be aware of: only the first person is credited in the log.
- **Two people editing the same task at once.** The second save overwrites the first without a warning. Nothing is lost silently, because both edits are in the history with their old and new values, but it is a real risk with many users.
- **Stale screens.** There is no live update. The more users, the more often someone clicks on an outdated status. The backend rejects it and the UI reloads, so data stays correct, but the experience gets worse.
- **Unbounded lists.** `GET /tasks` and both history endpoints return everything, with no pagination. The history of all tasks only ever grows, so it is the first to become slow.

### 3. Jika task ini berkembang menjadi sistem skala besar, bagian mana yang akan kamu refactor terlebih dahulu dan kenapa?

**First, the database: SQLite → PostgreSQL with an asynchronous driver.** It is the bottleneck described above and the one thing preventing more than one backend instance. It is also a contained change: all SQL is in the `*.repository.ts` file of each feature, so the services and routes keep their logic (they become `async`). The transaction would use row locking (`SELECT … FOR UPDATE`) or a conditional update (`WHERE status = <expected>`), and the application's database user would get insert-and-read-only rights on the audit table.

**Second, identity.** The actor currently comes from a header the client fills in, so anyone can claim to be anyone on the list. An audit log is only as trustworthy as its "who". Authentication would move the actor into the session.

After those: pagination and filtering for the history, conflict detection for edits, and live updates.

### 4. Jika kamu menggunakan AI, jelaskan bagian mana yang dibantu AI dan bagaimana cara kamu memvalidasinya?

I used AI (Claude Code) as a working partner at every stage of this test.

**Where AI helped**

1. **Understanding the tech test.** Breaking the brief down into concrete requirements — functional, non-functional and deliverables — so that nothing was missed. That breakdown became [docs/PRD.md](docs/PRD.md).
2. **Brainstorming the best setup.** Comparing options before building: where to store the data, how to make the audit log impossible to change, how to keep a task's status and its log in sync, and whether the two projects should share code. What was chosen and what each choice costs is in [Trade-offs](#trade-offs).
3. **Architecture.** Turning the structure I wanted into concrete rules: the same three features on both sides, each with routes → service → repository on the backend and components → hook → api on the frontend, and only `tasks` depending on the other two.
4. **Defining the documents.** Deciding what each document under `docs/` should cover — PRD, architecture, folder structure, design system, validation — and drafting them.
5. **Implementation.** The code was written with Claude Code, following the decisions above.
6. **Validating every feature.** Writing the tests and running the checks described below.

The direction was mine: the layout of the repository (`backend`, `frontend`, `docs`), the feature-based architecture with repository, service and routes, mirroring that structure on the frontend, keeping the two projects free of a shared package, and which documents to write.

**How it was validated**

- **Requirement by requirement** — every requirement in the PRD is mapped to the test or manual check that proves it, in [docs/VALIDATION.md](docs/VALIDATION.md).
- **Automated tests** — 31 tests run the real API against an in-memory database, including the failure cases: invalid transitions, repeated updates, an unknown acting user, a forced log-write failure for every kind of write, and direct `UPDATE`/`DELETE` on the audit table.
- **Type checking** — `npm run typecheck` across both projects, with strict settings.
- **Running it** — the full flow was walked through in the browser, and the error responses were checked with `curl`.
- **A fresh copy** — the tracked files were copied to an empty folder and installed, tested and built from scratch.

The same document also lists what was *not* verified.
