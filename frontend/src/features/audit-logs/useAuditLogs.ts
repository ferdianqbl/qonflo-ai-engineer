import { useEffect, useState } from "react";
import { getErrorMessage } from "../../core/http";
import { auditLogApi } from "./audit-log.api";
import type { AuditLog } from "./audit-log.types";

interface UseAuditLogsOptions {
  /** History of this task only. Leave out for the history of all tasks. */
  taskId?: string;
  /** The history is loaded again whenever this value changes. */
  refreshKey?: string;
}

/** Loads a history, oldest entry first. `logs` is null until the first answer arrives. */
export function useAuditLogs({ taskId, refreshKey }: UseAuditLogsOptions = {}) {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = taskId ? auditLogApi.listForTask(taskId) : auditLogApi.listAll();
    load
      .then((result) => {
        if (!cancelled) {
          setLogs(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [taskId, refreshKey]);

  return { logs, error };
}
