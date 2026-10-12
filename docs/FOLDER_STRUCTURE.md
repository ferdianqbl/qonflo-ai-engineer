# Folder Structure

`app/` holds three folders: `backend/`, `frontend/` and `docs/`.

Both projects are organised by **feature**. The three features — `tasks`, `audit-logs`, `actors` — exist on both sides under the same names, and every feature folder has the same shape.

```
app/
├── README.md                  Run instructions, assumptions, trade-offs, evaluation answers
├── package.json               npm workspace root: scripts that install and run both projects
├── tsconfig.base.json         Strict TypeScript settings used by both projects
│
├── backend/                   Express API (BE project)
│   ├── src/
│   │   ├── index.ts           Entry point: open the database, start listening
│   │   ├── app.ts             Composition root: builds every feature and mounts its router
│   │   │
│   │   ├── core/              Not a feature: used by all of them
│   │   │   ├── config.ts            Port and database path (from environment variables)
│   │   │   ├── database.ts          Opens SQLite, creates the schema and triggers, transaction helper
│   │   │   ├── task-status.ts       The statuses and the transition rule            ◀ mirrored
│   │   │   ├── errors.ts            Typed errors and the error response shape
│   │   │   ├── error-handler.ts     Turns any error into the { error: { code, message } } response
│   │   │   └── validation.ts        Validates a request body against a zod schema
│   │   │
│   │   └── features/
│   │       ├── tasks/
│   │       │   ├── task.routes.ts        HTTP: /api/tasks
│   │       │   ├── task.schemas.ts       Request body schemas (zod)
│   │       │   ├── task.service.ts       Rules: status flow, idempotency, status + log together
│   │       │   ├── task.repository.ts    SQL for the tasks table
│   │       │   └── task.types.ts         Task and its request shapes                 ◀ mirrored
│   │       ├── audit-logs/
│   │       │   ├── audit-log.routes.ts       HTTP: GET /api/tasks/:id/audit-logs
│   │       │   ├── audit-log.service.ts      record() and listForTask() — nothing else
│   │       │   ├── audit-log.repository.ts   SQL for the audit_logs table: insert and read only
│   │       │   └── audit-log.types.ts        AuditLog shape                          ◀ mirrored
│   │       └── actors/
│   │           ├── actor.routes.ts       HTTP: GET /api/actors
│   │           ├── actor.service.ts      List actors; reject an unknown actor
│   │           └── actor.repository.ts   The predefined user list
│   │
│   ├── tests/
│   │   ├── status-flow.test.ts      The status flow rule on its own
│   │   └── tasks.api.test.ts        The API end to end, against an in-memory database
│   └── data/                  SQLite file, created on first run (git-ignored)
│
├── frontend/                  React app (FE project)
│   ├── index.html
│   ├── vite.config.ts         Dev server and the /api proxy
│   └── src/
│       ├── main.tsx           Entry point
│       ├── App.tsx            Composition root: page layout, connects the features
│       ├── index.css          All styles and design tokens
│       │
│       ├── core/              Not a feature: used by all of them
│       │   ├── http.ts              The fetch wrapper, ApiError and the error response shape
│       │   ├── task-status.ts       The statuses and the transition rule            ◀ mirrored
│       │   ├── status-labels.ts     Status → display label
│       │   └── format.ts            Date formatting
│       │
│       ├── components/        UI used by more than one feature
│       │   └── StatusBadge.tsx      Coloured status label
│       │
│       └── features/
│           ├── tasks/
│           │   ├── task.api.ts           Calls to /api/tasks
│           │   ├── useTasks.ts           Task list state and actions
│           │   ├── task.types.ts         Task and its request shapes                 ◀ mirrored
│           │   └── components/
│           │       ├── TaskForm.tsx      Create a task
│           │       ├── TaskList.tsx      The list, with loading and empty states
│           │       ├── TaskItem.tsx      One task: status, actions, history toggle
│           │       └── StatusFlow.tsx    The four-step progress bar
│           ├── audit-logs/
│           │   ├── audit-log.api.ts      Call to /api/tasks/:id/audit-logs
│           │   ├── useAuditLogs.ts       Loads (and reloads) the history of one task
│           │   ├── audit-log.types.ts    AuditLog shape                              ◀ mirrored
│           │   └── components/
│           │       └── AuditLogPanel.tsx Status history of one task
│           └── actors/
│               ├── actor.api.ts          Call to /api/actors
│               ├── useActors.ts          User list and the selected actor
│               └── components/
│                   └── ActorSelect.tsx   "Acting as" dropdown
│
└── docs/                      Documentation
    ├── PRD.md                 What is being built and why
    ├── ARCHITECTURE.md        How it is built: features, layers, data model, API, decisions
    ├── FOLDER_STRUCTURE.md    This file
    ├── DESIGN_SYSTEM.md       Visual rules of the UI
    └── VALIDATION.md          How each requirement was verified
```

## The shape of a feature

| | Backend | Frontend |
|---|---|---|
| Entry point | `<feature>.routes.ts` | `components/` |
| Logic | `<feature>.service.ts` | `use<Feature>.ts` |
| Data access | `<feature>.repository.ts` | `<feature>.api.ts` |
| Data shapes | `<feature>.types.ts` | `<feature>.types.ts` |

## Mirrored files

Files marked **◀ mirrored** exist in both projects under the same path with identical content. They are the contract between the two sides. When one changes, copy it to the other project.

| File | Contains |
|---|---|
| `src/core/task-status.ts` | The four statuses, `getNextStatus`, `canTransition` |
| `src/features/tasks/task.types.ts` | `Task`, `CreateTaskRequest`, `UpdateTaskStatusRequest` |
| `src/features/audit-logs/audit-log.types.ts` | `AuditLog` |

## Where does new code go?

| I want to… | Put it in… |
|---|---|
| Add a whole new feature (say, comments) | A new folder `features/comments/` on each side with the files above, then register it in `app.ts` and `App.tsx` |
| Add a business rule about tasks | `backend/src/features/tasks/task.service.ts` |
| Add or change a SQL query | The `*.repository.ts` of the feature that owns the table |
| Add an endpoint | The feature's `*.routes.ts` on the backend, then its `*.api.ts` on the frontend |
| Change the status flow or add a status | `core/task-status.ts` on both sides (then add a label and a badge colour in the frontend) |
| Change the shape of a request or response | The feature's `*.types.ts` on both sides |
| Add a user to the actor list | `backend/src/features/actors/actor.repository.ts` |
| Add a piece of UI for one feature | That feature's `components/` |
| Add UI needed by several features | `frontend/src/components/` |
| Add client-side state or a server call sequence | The feature's `use<Feature>.ts` |
| Change a colour or spacing | The tokens at the top of `frontend/src/index.css` |

## Rules

- **Inside a feature, dependencies point one way**: routes → service → repository on the backend; components → hook → api on the frontend. Nothing imports "upwards".
- **Between features, only `tasks` depends on others** (`audit-logs` and `actors`), and it goes through their service — never straight to another feature's repository.
- **`core/` never imports from a feature.** Features import from `core/`.
- **Only the composition roots know every feature**: `backend/src/app.ts` and `frontend/src/App.tsx`.
- **The two projects import nothing from each other.** What they share is kept as mirrored files.
- **Backend files** are named `<feature>.<layer>.ts`. **Frontend components** are one component per file, named after the component.
