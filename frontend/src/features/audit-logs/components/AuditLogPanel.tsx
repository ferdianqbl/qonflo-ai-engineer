import { useAuditLogs } from "../useAuditLogs";
import { AuditLogList } from "./AuditLogList";

interface AuditLogPanelProps {
  taskId: string;
  taskTitle: string;
  /** The history is loaded again whenever this value changes. */
  refreshKey: string;
}

/** The history of one task, shown inside that task. */
export function AuditLogPanel({ taskId, taskTitle, refreshKey }: AuditLogPanelProps) {
  const { logs, error } = useAuditLogs({ taskId, refreshKey });

  return (
    <section className="audit-log" aria-label={`History of ${taskTitle}`}>
      <h4>History</h4>
      <AuditLogList logs={logs} error={error} showTask={false} />
    </section>
  );
}
