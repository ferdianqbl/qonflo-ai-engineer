import { request } from "../../core/http";
import type { AuditLog } from "./audit-log.types";

// Read-only, like the backend feature it talks to.
export const auditLogApi = {
  listForTask: (taskId: string) => request<AuditLog[]>(`/tasks/${taskId}/audit-logs`),
};
