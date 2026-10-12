# Design System

The UI is plain CSS in one file, [`frontend/src/index.css`](../frontend/src/index.css). There is no UI framework. Every value below is a CSS custom property defined at the top of that file.

## Principles

1. **Status is never ambiguous.** Each task shows its status twice: as a coloured badge and as its position in the four-step flow.
2. **Colour is never the only signal.** Every badge and step carries its text label.
3. **Only valid actions are offered.** A task shows one "Move to …" button for its next status, or none when it is done.
4. **History is one click away.** A task's history opens inside the task. The History tab shows the history of all tasks, including deleted ones.
5. **The server's word is shown as-is.** When the backend rejects something, its message appears in a banner.

## Colour tokens

### Interface

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#f4f5f7` | Page background |
| `--surface` | `#ffffff` | Cards, inputs, default buttons |
| `--border` | `#d9dde3` | Card and input borders, inactive flow steps |
| `--text` | `#1c2430` | Body text |
| `--muted` | `#5f6b7a` | Secondary text: descriptions, timestamps, hints |
| `--primary` | `#1d4ed8` | Primary button, current flow step, focus ring |
| `--danger` | `#b91c1c` | Confirm-delete button |

### Status

One background/text pair per status, used by `StatusBadge` everywhere a status appears (task header and history entries).

| Status | Label | Background | Text |
|---|---|---|---|
| `to_do` | To Do | `--to-do-bg` `#e5e7eb` | `--to-do-text` `#374151` |
| `pending` | Pending | `--pending-bg` `#fef3c7` | `--pending-text` `#92400e` |
| `in_progress` | In Progress | `--in-progress-bg` `#dbeafe` | `--in-progress-text` `#1e40af` |
| `done` | Done | `--done-bg` `#dcfce7` | `--done-text` `#166534` |

The error banner uses a fixed red set: background `#fef2f2`, border `#fecaca`, text `#7f1d1d`.

## Typography

System font stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`), base size 15px, line height 1.5.

| Element | Size | Weight |
|---|---|---|
| Page title (`h1`) | 1.5rem | bold |
| Section title (`h2`) | 1.1rem | bold |
| Task title (`h3`) | 1rem | bold |
| Body | 1rem | normal |
| Field label, history heading, task name in a history entry | 0.85rem | 600 |
| Badge, flow step, meta line | 0.8rem | 600 / normal |

Timestamps in a history use tabular numerals so they line up in a column.

## Spacing and shape

- Page: single column, max width 820px, 16px side padding.
- Vertical rhythm: 20px between page sections, 12px between elements inside a card.
- Cards: 16px padding, 1px border, 8px radius.
- Inputs and buttons: 6px radius. Badges: fully rounded.

## Components

| Component | File | Notes |
|---|---|---|
| Card | `.card` | Container for the form, each task, and the history of all tasks |
| Tabs | `.tabs` | Switch between **Tasks** and **History**. The active tab has a `--primary` underline |
| Button | `.button` | Variants: default (outlined), `--primary` (main action), `--danger` (confirm delete), `--quiet` (low emphasis: Delete, Dismiss) |
| Form field | `label` + `input` / `textarea` / `select` | Label always visible above the control |
| Status badge | `StatusBadge.tsx` | Pill with the status label and colour pair |
| Status flow | `StatusFlow.tsx` | Four equal segments. Past steps are tinted, the current step is `--primary` and bold, upcoming steps are grey |
| Actor select | `ActorSelect.tsx` | "Acting as" dropdown in the page header |
| Task form | `TaskForm.tsx` | Title and description. Used in the "New task" card and, pre-filled, inside a task when editing |
| Task item | `TaskItem.tsx` | Title + badge, description, flow, created/updated line, actions, optional history. **Edit** swaps the title and description for the form |
| History entry | `AuditLogEntry.tsx` | time · **actor** + what they did. A status is shown as a badge, text in quotes, a cleared value as *empty* |
| History of one task | `AuditLogPanel.tsx` | Ordered list inside the task, oldest first |
| History of all tasks | `AuditLogHistory.tsx` | The History tab. Same list, with each entry labelled with its task's name |
| Alert | `.alert` | Error banner with a Dismiss button |
| Empty state | `.empty` | Dashed box with a hint |

## States

| Situation | What the user sees |
|---|---|
| Loading tasks | "Loading tasks…" |
| No tasks | "No tasks yet. Create the first one above." |
| Request in flight | The task's action buttons are disabled |
| Task is `done` | No move button; "Completed — no further status" instead |
| Editing a task | The form replaces the title and description; **Save changes** / **Cancel** |
| Empty history | "Nothing has happened yet." |
| No acting user selected | Buttons that write (Add task, Move, Save changes, Yes delete) are disabled |
| Backend rejects a change | Red banner with the backend's message; the list reloads |
| Delete | Two steps inline: **Delete** → "Delete this task? **Yes, delete** / **Cancel**" |

## Accessibility

- Every input has a visible `<label>`.
- The current flow step is marked with `aria-current="step"`.
- The history toggle exposes `aria-expanded`.
- The active tab is marked with `aria-current="page"`.
- Error banners use `role="alert"` so they are announced.
- Keyboard focus is shown with a 2px `--primary` outline on buttons, tabs and form controls.
- History times are `<time>` elements carrying the exact ISO timestamp.

Not done: no dark theme, and colour contrast has not been measured against WCAG.
