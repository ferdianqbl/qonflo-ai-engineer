import type { ReactNode } from "react";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatDateTime } from "../../../core/format";
import { isTaskStatus } from "../../../core/task-status";
import type { AuditLog } from "../audit-log.types";

/** One side of a change: a status as a badge, text in quotes, nothing as "empty". */
function ChangedValue({ log, value }: { log: AuditLog; value: string | null }) {
  if (log.field === "status" && isTaskStatus(value)) {
    return <StatusBadge status={value} />;
  }
  if (!value) {
    return <em>empty</em>;
  }
  return <q>{value}</q>;
}

/** What happened, as the rest of the sentence that starts with the actor's name. */
function describe(log: AuditLog): ReactNode {
  switch (log.action) {
    case "created":
      return "created the task";
    case "deleted":
      return "deleted the task";
    case "updated":
    case "status_changed":
      return (
        <>
          changed {log.field} from <ChangedValue log={log} value={log.fromValue} /> to{" "}
          <ChangedValue log={log} value={log.toValue} />
        </>
      );
  }
}

interface AuditLogEntryProps {
  log: AuditLog;
  /** Name the task in the entry. Needed in the history of all tasks, redundant inside one task. */
  showTask: boolean;
}

export function AuditLogEntry({ log, showTask }: AuditLogEntryProps) {
  return (
    <li className="audit-log__entry">
      <time dateTime={log.timestamp} title={log.timestamp}>
        {formatDateTime(log.timestamp)}
      </time>
      <span>
        {showTask && <span className="audit-log__task">{log.taskTitle}</span>}
        <strong>{log.actor}</strong> {describe(log)}
      </span>
    </li>
  );
}
