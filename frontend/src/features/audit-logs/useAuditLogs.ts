import { useEffect, useState } from "react";
import { getErrorMessage } from "../../core/http";
import { auditLogApi } from "./audit-log.api";
import type { AuditLog } from "./audit-log.types";

/**
 * Loads the history of one task, and loads it again whenever `refreshKey` changes.
 * `logs` is null until the first answer arrives.
 */
export function useAuditLogs(taskId: string, refreshKey: string) {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    auditLogApi
      .listForTask(taskId)
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
