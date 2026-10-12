import { useAuditLogs } from "../useAuditLogs";
import { AuditLogList } from "./AuditLogList";

/** The history of all tasks, including tasks that have been deleted. */
export function AuditLogHistory() {
  const { logs, error } = useAuditLogs();

  return (
    <section className="card audit-log audit-log--all">
      <h2>
        History of all tasks {logs && <span className="count">{logs.length}</span>}
      </h2>
      <AuditLogList logs={logs} error={error} showTask />
    </section>
  );
}
