import type { AuditLog } from "../audit-log.types";
import { AuditLogEntry } from "./AuditLogEntry";

interface AuditLogListProps {
  /** Null while loading. */
  logs: AuditLog[] | null;
  error: string | null;
  showTask: boolean;
}

/** A history with its loading, error and empty states. Oldest entry first. */
export function AuditLogList({ logs, error, showTask }: AuditLogListProps) {
  if (error) {
    return <p className="audit-log__note">{error}</p>;
  }
  if (logs === null) {
    return <p className="audit-log__note">Loading…</p>;
  }
  if (logs.length === 0) {
    return <p className="audit-log__note">Nothing has happened yet.</p>;
  }

  return (
    <ol className="audit-log__list">
      {logs.map((log) => (
        <AuditLogEntry key={log.id} log={log} showTask={showTask} />
      ))}
    </ol>
  );
}
