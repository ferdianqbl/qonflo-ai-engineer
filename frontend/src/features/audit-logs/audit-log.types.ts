/**
 * The audit-log part of the API contract. This file is kept identical in the
 * `features/audit-logs` folder of the backend and of the frontend.
 */
export type AuditAction = "created" | "updated" | "status_changed" | "deleted";

export type AuditField = "title" | "description" | "status";

/**
 * One thing one actor did to one task.
 *
 * `field`, `fromValue` and `toValue` describe what changed, and are null when the action is not
 * a change of a field ("created", "deleted"). For "status_changed", `field` is "status" and the
 * two values are the status before and after.
 */
export interface AuditLog {
  id: number;
  taskId: string;
  /** The task's title at the moment of the action. */
  taskTitle: string;
  actor: string;
  action: AuditAction;
  field: AuditField | null;
  fromValue: string | null;
  toValue: string | null;
  timestamp: string;
}

/** An entry before it is stored: everything except the generated id. */
export type NewAuditLog = Omit<AuditLog, "id">;
