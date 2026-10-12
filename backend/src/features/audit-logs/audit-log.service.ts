import type { AuditLogRepository } from "./audit-log.repository";
import type { AuditLog } from "./audit-log.types";

/** What the rest of the app may do with audit logs: add one, and read them. Nothing else. */
export class AuditLogService {
  private readonly repository: AuditLogRepository;

  constructor(repository: AuditLogRepository) {
    this.repository = repository;
  }

  /** Called by the task feature, inside the same transaction as the status update. */
  record(entry: Omit<AuditLog, "id">): void {
    this.repository.insert(entry);
  }

  listForTask(taskId: string): AuditLog[] {
    return this.repository.findByTaskId(taskId);
  }
}
