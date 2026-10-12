import { useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatDateTime } from "../../../core/format";
import { STATUS_LABELS } from "../../../core/status-labels";
import { getNextStatus, type TaskStatus } from "../../../core/task-status";
import { AuditLogPanel } from "../../audit-logs/components/AuditLogPanel";
import type { Task } from "../task.types";
import { StatusFlow } from "./StatusFlow";

interface TaskItemProps {
  task: Task;
  actor: string;
  onChangeStatus: (taskId: string, status: TaskStatus, actor: string) => Promise<boolean>;
  onDelete: (taskId: string) => Promise<boolean>;
}

export function TaskItem({ task, actor, onChangeStatus, onDelete }: TaskItemProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // Same rule the backend enforces, so the UI only ever offers the one valid move.
  const nextStatus = getNextStatus(task.status);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    await action();
    setBusy(false);
  }

  return (
    <li className="card task">
      <div className="task__header">
        <h3>{task.title}</h3>
        <StatusBadge status={task.status} />
      </div>

      {task.description && <p className="task__description">{task.description}</p>}

      <StatusFlow current={task.status} />

      <p className="task__meta">
        Created {formatDateTime(task.createdAt)} · Updated {formatDateTime(task.updatedAt)}
      </p>

      <div className="task__actions">
        {nextStatus ? (
          <button
            className="button button--primary"
            disabled={busy || !actor}
            onClick={() => run(() => onChangeStatus(task.id, nextStatus, actor))}
          >
            Move to {STATUS_LABELS[nextStatus]}
          </button>
        ) : (
          <span className="task__finished">Completed — no further status</span>
        )}

        <button
          className="button"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((shown) => !shown)}
        >
          {showHistory ? "Hide history" : "Show history"}
        </button>

        {confirmingDelete ? (
          <span className="task__confirm">
            Delete this task?
            <button
              className="button button--danger"
              disabled={busy}
              onClick={() => run(() => onDelete(task.id))}
            >
              Yes, delete
            </button>
            <button className="button" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button className="button button--quiet" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        )}
      </div>

      {/* `updatedAt` moves on every status change, so an open panel refreshes itself. */}
      {showHistory && (
        <AuditLogPanel taskId={task.id} taskTitle={task.title} refreshKey={task.updatedAt} />
      )}
    </li>
  );
}
