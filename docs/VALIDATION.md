# Validation

How each requirement in [PRD.md](PRD.md) was verified, and what was not verified.

## How to re-run

```bash
npm install
npm test          # 31 backend tests
npm run typecheck # backend and frontend
npm run build     # production build of the frontend
```

## Result

Last run on 2026-10-12 — macOS, Node.js 24.21, npm 11.19.

| Check | Result |
|---|---|
| Automated tests (`npm test`) | 31 of 31 passed |
| Type check (`npm run typecheck`) | No errors in either project |
| Frontend build (`npm run build`) | Succeeded |
| Fresh-copy install (repository files only → `npm install` → test, typecheck, build) | Succeeded |
| Manual walkthrough in the browser | All steps below behaved as expected |

## Requirement → evidence

The tests run the real Express app against an in-memory SQLite database, so they cover routing, validation, the services, the SQL and the triggers together. Test names are quoted from [`backend/tests/`](../backend/tests/).

| Requirement | Evidence |
|---|---|
| FR-1 Create task | `creates a task in to_do, lists it, and records who created it` · `rejects a task without a title` |
| FR-2 List tasks | `creates a task in to_do, lists it, and records who created it` |
| FR-3 Status flow | `moves a task one step forward and records who did it` · `walks to_do → pending → in_progress → done and then stops` |
| FR-4 Delete task | `removes the task from the list and records who deleted it` · `returns 404 for any further change to a deleted or unknown task` |
| FR-5 Audit entry per status change | `moves a task one step forward and records who did it` (checks task, actor, both statuses, timestamp) |
| FR-6 History of one task, chronological | `returns the history of one task in chronological order` · `returns 404 for the history of a task that never existed` |
| FR-7 Predefined actors | `lists the predefined users for the dropdown` · `rejects a create / update / status change / delete by someone who is not on the predefined list` (four tests) |
| FR-8 Edit task | `changes title and description and records one entry per changed field` · `rejects an empty title without changing anything` |
| FR-9 Create, edit and delete are recorded | `creates a task in to_do, lists it, and records who created it` · `records only the field that really changed` · `removes the task from the list and records who deleted it` |
| FR-10 History of all tasks | `returns every entry of every task in chronological order, deleted tasks included` |
| NFR-1 Idempotent update | `is idempotent: setting the current status again writes no audit log` · `is idempotent: saving the same values writes no audit log` |
| NFR-2 Task and log in sync | `when the audit log cannot be written`: `does not create the task` · `rolls the update back` · `rolls the status change back` · `rolls the delete back` — the log insert is forced to fail; the task must be unchanged |
| NFR-3 Immutable log | `makes the database itself refuse UPDATE and DELETE on audit_logs` · `exposes no way to modify or delete audit logs over HTTP` · `removes the task from the list and records who deleted it` (history still readable afterwards) |
| NFR-4 Backend validation | `rejects skipping a step…` · `rejects jumping to the end…` · `rejects going backwards…` · `rejects reopening a finished task…` (each also checks nothing changed) · `rejects a status that does not exist` · `allows exactly the three one-step-forward transitions out of all sixteen pairs` |
| NFR-5 Persistence | SQLite file at `backend/data/tasks.db`; step 7 of the walkthrough |

## Manual walkthrough

Done in a Chromium-based browser against a running dev server with an empty database.

| # | Step | Observed |
|---|---|---|
| 1 | As `john.doe`, create "Prepare Invoice" with a description, then open its history | Appears as **To Do**; history shows "john.doe created the task" |
| 2 | As `jane.smith`, click **Edit**, change the title to "Prepare Invoice Q4", clear the description, **Save changes** | The form closes and the new title is shown. The open history gains two entries: title from "Prepare Invoice" to "Prepare Invoice Q4", and description from "For client A" to *empty* |
| 3 | As `budi.santoso`, **Move to Pending** | The task shows Pending |
| 4 | As `budi.santoso`, create a second task, "Review Contract" | Appears at the top of the list |
| 5 | Delete "Prepare Invoice Q4" (Delete → Yes, delete) | The task leaves the list |
| 6 | Open the **History** tab | Six entries, oldest first, each labelled with the task's name as it was at that moment. The deleted task's entries are all there and end with "budi.santoso deleted the task" |
| 7 | Restart the server and reload | The remaining task and all six history entries are still there |
| 8 | Stale screen: while the page shows a task as To Do, move it twice through the API, then click **Move to Pending** | Red banner with the backend's `INVALID_TRANSITION` message; the list reloads and shows In Progress |
| 9 | Move "Review Contract" through all three steps | No move button at the end; "Completed — no further status" |

Direct API calls with `curl`:

| Request | Response |
|---|---|
| `POST /tasks` without an `X-Actor` header | `400 VALIDATION_ERROR` |
| `PUT /tasks/:id` with `X-Actor: mallory` | `400 VALIDATION_ERROR` |
| `DELETE /tasks/:id` without an `X-Actor` header | `400 VALIDATION_ERROR` |
| `PUT /tasks/:id` with a blank title | `400 VALIDATION_ERROR` — "title must be a non-empty string" |
| `PUT /tasks/:id` with the values it already has | `200`, history length unchanged |
| `PATCH` status `to_do` → `done` | `409 INVALID_TRANSITION` |
| `PUT` on an unknown task id | `404 TASK_NOT_FOUND` |
| `POST /audit-logs` | `404 NOT_FOUND` — no such route |

## Not verified

- **Frontend has no automated tests.** It was checked by hand only.
- **No load or concurrency test.** The transaction design is reasoned about in the README, not measured.
- **One environment.** Only macOS with Node.js 24 and one Chromium-based browser were tried. Node.js 22 is the minimum the dependencies declare, but it was not run there.
- **Single process only.** Running several backend instances against one database file was not tried.
- **No upgrade path for an existing database.** A database file created before the history covered edits and deletes has the old table layout and must be deleted.
