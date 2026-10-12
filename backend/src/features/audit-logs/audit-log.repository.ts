import type { Db } from "../../core/database";
import type { TaskStatus } from "../../core/task-status";
import type { AuditLog } from "./audit-log.types";

interface AuditLogRow {
  id: number;
  task_id: string;
  actor: string;
  from_status: TaskStatus;
  to_status: TaskStatus;
  timestamp: string;
}

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    taskId: row.task_id,
    actor: row.actor,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    timestamp: row.timestamp,
  };
}

/**
 * Insert and read only: there is deliberately no method that updates or deletes an audit log.
 */
export class AuditLogRepository {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  insert(entry: Omit<AuditLog, "id">): void {
    this.db
      .prepare(
        `INSERT INTO audit_logs (task_id, actor, from_status, to_status, timestamp)
         VALUES (@taskId, @actor, @fromStatus, @toStatus, @timestamp)`,
      )
      .run(entry);
  }

  /** Oldest first. `id` is auto-incremented, so it is also the order the changes happened in. */
  findByTaskId(taskId: string): AuditLog[] {
    return this.db
      .prepare<[string], AuditLogRow>(
        `SELECT id, task_id, actor, from_status, to_status, timestamp
         FROM audit_logs WHERE task_id = ? ORDER BY id ASC`,
      )
      .all(taskId)
      .map(toAuditLog);
  }
}
