import type { AuditLogRepository } from "./audit-log.repository";
import type { AuditLog, NewAuditLog } from "./audit-log.types";

/** What the rest of the app may do with audit logs: add one, and read them. Nothing else. */
export class AuditLogService {
  private readonly repository: AuditLogRepository;

  constructor(repository: AuditLogRepository) {
    this.repository = repository;
  }

  /** Called by the task feature, inside the same transaction as the change it describes. */
  record(entry: NewAuditLog): void {
    this.repository.insert(entry);
  }

  /** The history of every task, oldest first. */
  listAll(): AuditLog[] {
    return this.repository.findAll();
  }

  /** The history of one task, oldest first. */
  listForTask(taskId: string): AuditLog[] {
    return this.repository.findByTaskId(taskId);
  }
}
