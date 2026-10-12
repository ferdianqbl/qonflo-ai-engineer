import type { TaskStatus } from "../../core/task-status";

/**
 * The audit-log part of the API contract. This file is kept identical in the
 * `features/audit-logs` folder of the backend and of the frontend.
 */
export interface AuditLog {
  id: number;
  taskId: string;
  actor: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: string;
}
