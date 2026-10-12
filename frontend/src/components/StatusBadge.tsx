import { STATUS_LABELS } from "../core/status-labels";
import type { TaskStatus } from "../core/task-status";

/** Shared by more than one feature: the task list and the audit log both show statuses. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABELS[status]}</span>;
}
