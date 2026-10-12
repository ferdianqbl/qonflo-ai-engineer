import { StatusBadge } from "../../../components/StatusBadge";
import { formatDateTime } from "../../../core/format";
import { useAuditLogs } from "../useAuditLogs";

interface AuditLogPanelProps {
  taskId: string;
  taskTitle: string;
  /** The history is loaded again whenever this value changes. */
  refreshKey: string;
}

/** The status history of one task, oldest change first. */
export function AuditLogPanel({ taskId, taskTitle, refreshKey }: AuditLogPanelProps) {
  const { logs, error } = useAuditLogs(taskId, refreshKey);

  return (
    <section className="audit-log" aria-label={`Status history of ${taskTitle}`}>
      <h4>Status history</h4>

      {error && <p className="audit-log__note">{error}</p>}
      {!error && logs === null && <p className="audit-log__note">Loading…</p>}
      {!error && logs?.length === 0 && (
        <p className="audit-log__note">No status changes yet.</p>
      )}

      {logs && logs.length > 0 && (
        <ol className="audit-log__list">
          {logs.map((log) => (
            <li key={log.id}>
              <time dateTime={log.timestamp} title={log.timestamp}>
                {formatDateTime(log.timestamp)}
              </time>
              <span>
                <strong>{log.actor}</strong> changed status from{" "}
                <StatusBadge status={log.fromStatus} /> to <StatusBadge status={log.toStatus} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
