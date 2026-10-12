import type { Db } from "../../core/database";
import type { AuditAction, AuditField, AuditLog, NewAuditLog } from "./audit-log.types";

interface AuditLogRow {
  id: number;
  task_id: string;
  task_title: string;
  actor: string;
  action: AuditAction;
  field: AuditField | null;
  from_value: string | null;
  to_value: string | null;
  timestamp: string;
}

const COLUMNS = "id, task_id, task_title, actor, action, field, from_value, to_value, timestamp";

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    actor: row.actor,
    action: row.action,
    field: row.field,
    fromValue: row.from_value,
    toValue: row.to_value,
    timestamp: row.timestamp,
  };
}

/**
 * Insert and read only: there is deliberately no method that updates or deletes an audit log.
 * Both reads return the oldest entry first. `id` is auto-incremented, so ordering by it is
 * ordering by when things happened.
 */
export class AuditLogRepository {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  insert(entry: NewAuditLog): void {
    this.db
      .prepare(
        `INSERT INTO audit_logs (task_id, task_title, actor, action, field, from_value, to_value, timestamp)
         VALUES (@taskId, @taskTitle, @actor, @action, @field, @fromValue, @toValue, @timestamp)`,
      )
      .run(entry);
  }

  /** Every entry of every task, deleted tasks included. */
  findAll(): AuditLog[] {
    return this.db
      .prepare<[], AuditLogRow>(`SELECT ${COLUMNS} FROM audit_logs ORDER BY id ASC`)
      .all()
      .map(toAuditLog);
  }

  findByTaskId(taskId: string): AuditLog[] {
    return this.db
      .prepare<[string], AuditLogRow>(
        `SELECT ${COLUMNS} FROM audit_logs WHERE task_id = ? ORDER BY id ASC`,
      )
      .all(taskId)
      .map(toAuditLog);
  }
}
