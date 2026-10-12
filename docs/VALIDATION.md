# Validation

How each requirement in [PRD.md](PRD.md) was verified, and what was not verified.

## How to re-run

```bash
npm install
npm test          # 20 backend tests
npm run typecheck # backend and frontend
npm run build     # production build of the frontend
```

## Result

Last run on 2026-10-12 — macOS, Node.js 24.21, npm 11.19.

| Check | Result |
|---|---|
| Automated tests (`npm test`) | 20 of 20 passed |
| Type check (`npm run typecheck`) | No errors in either project |
| Frontend build (`npm run build`) | Succeeded |
| Fresh-copy install (tracked files only → `npm install` → test, typecheck, build) | Succeeded |
| Manual walkthrough in the browser | All steps below behaved as expected |

## Requirement → evidence

The tests run the real Express app against an in-memory SQLite database, so they cover routing, validation, the service, the SQL and the triggers together. Test names are quoted from [`backend/tests/`](../backend/tests/).

| Requirement | Evidence |
|---|---|
| FR-1 Create task | `creates a task in to_do and lists it` · `rejects a task without a title` |
| FR-2 List tasks | `creates a task in to_do and lists it` |
| FR-3 Status flow | `moves a task one step forward and records who did it` · `walks to_do → pending → in_progress → done and then stops` |
| FR-4 Delete task | `removes a deleted task from the list` |
| FR-5 Audit entry per change | `moves a task one step forward and records who did it` (checks task id, actor, both statuses, timestamp) |
| FR-6 Chronological log | `returns the audit log in chronological order` · `returns 404 for the audit log of a task that never existed` |
| FR-7 Predefined actors | `lists the predefined users for the dropdown` · `rejects an unknown status or an actor that is not on the predefined list` |
| NFR-1 Idempotent update | `is idempotent: setting the current status again writes no audit log` |
| NFR-2 Status and log in sync | `rolls the status change back when the audit log cannot be written` — the log insert is forced to fail; the task must still be `to_do` |
| NFR-3 Immutable log | `makes the database itself refuse UPDATE and DELETE on audit_logs` · `exposes no way to modify or delete audit logs over HTTP` · `keeps the audit log readable after its task is deleted` |
| NFR-4 Backend validation | `rejects skipping a step…` · `rejects jumping to the end…` · `rejects going backwards…` · `rejects reopening a finished task…` (each also checks nothing changed) · `allows exactly the three one-step-forward transitions out of all sixteen pairs` |
| NFR-5 Persistence | SQLite file at `backend/data/tasks.db`; tasks created in the browser were still listed after the dev server was restarted |

## Manual walkthrough

Done in a Chromium-based browser against `npm run dev`. Steps 1 and 3–7, the restart check for persistence and the `curl` calls were repeated after the code was reorganised into features.

| # | Step | Observed |
|---|---|---|
| 1 | Create "Prepare Invoice" with a description | Appears at the top of the list as **To Do**; the form clears |
| 2 | Open its history before any change | "No status changes yet." |
| 3 | As `john.doe`, click **Move to Pending** | Badge and flow show Pending; the open history gains one entry without reopening |
| 4 | Switch to `jane.smith`, **Move to In Progress**; switch to `budi.santoso`, **Move to Done** | Three entries, oldest first, each with the right actor and statuses |
| 5 | Look at the finished task | No move button; "Completed — no further status" |
| 6 | Stale screen: while the page shows a task as To Do, move it twice through the API, then click **Move to Pending** | Red banner with the backend's `INVALID_TRANSITION` message; the list reloads and shows In Progress |
| 7 | Delete a task that has history (Delete → Yes, delete) | Task leaves the list; `GET /api/tasks/:id/audit-logs` for its id still returns both entries |

Direct API calls with `curl`:

| Request | Response |
|---|---|
| `PATCH` status `to_do` → `done` | `409 INVALID_TRANSITION` |
| `PATCH` with actor `mallory` | `400 VALIDATION_ERROR` |
| `PATCH` with an empty body | `400 VALIDATION_ERROR` naming both missing fields |
| `POST /tasks` with an empty body | `400 VALIDATION_ERROR` — "title must be a non-empty string" |
| `GET` audit log of an unknown task id | `404 TASK_NOT_FOUND` |
| `PUT` on a task's audit log | `404 NOT_FOUND` — no such route |
| `POST /tasks` with broken JSON | `400 VALIDATION_ERROR` |
| `GET /api/nope` | `404 NOT_FOUND` |
| `PATCH` to the status the task already has | `200`, audit log length unchanged |

## Not verified

- **Frontend has no automated tests.** It was checked by hand only.
- **No load or concurrency test.** The transaction design is reasoned about in the README, not measured.
- **One environment.** Only macOS with Node.js 24 and one Chromium-based browser were tried. Node.js 22 is the minimum the dependencies declare, but it was not run there.
- **Single process only.** Running several backend instances against one database file was not tried.
