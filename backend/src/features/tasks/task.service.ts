import { randomUUID } from "node:crypto";
import type { RunInTransaction } from "../../core/database";
import { InvalidTransitionError, TaskNotFoundError } from "../../core/errors";
import { canTransition, getNextStatus, INITIAL_STATUS } from "../../core/task-status";
import type { ActorService } from "../actors/actor.service";
import type { AuditLogService } from "../audit-logs/audit-log.service";
import type { TaskRepository } from "./task.repository";
import type { CreateTaskRequest, Task, UpdateTaskStatusRequest } from "./task.types";

/** Business rules for tasks. Knows nothing about HTTP or SQL. */
export class TaskService {
  private readonly repository: TaskRepository;
  private readonly auditLogs: AuditLogService;
  private readonly actors: ActorService;
  private readonly runInTransaction: RunInTransaction;

  constructor(
    repository: TaskRepository,
    auditLogs: AuditLogService,
    actors: ActorService,
    runInTransaction: RunInTransaction,
  ) {
    this.repository = repository;
    this.auditLogs = auditLogs;
    this.actors = actors;
    this.runInTransaction = runInTransaction;
  }

  listTasks(): Task[] {
    return this.repository.findAll();
  }

  createTask(input: CreateTaskRequest): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description || null,
      status: INITIAL_STATUS,
      createdAt: now,
      updatedAt: now,
    };
    this.repository.insert(task);
    return task;
  }

  /**
   * Moves a task to `status` on behalf of `actor`.
   *
   * The read, the rule check and both writes run in one transaction, so the task's status and
   * its audit log cannot drift apart: if the log entry cannot be written, the status change is
   * rolled back too.
   */
  changeStatus(taskId: string, { status: toStatus, actor }: UpdateTaskStatusRequest): Task {
    this.actors.assertKnownActor(actor);

    return this.runInTransaction(() => {
      const task = this.repository.findById(taskId);
      if (!task) {
        throw new TaskNotFoundError(taskId);
      }

      // Idempotent: asking for the status the task already has changes nothing and logs nothing.
      if (task.status === toStatus) {
        return task;
      }

      if (!canTransition(task.status, toStatus)) {
        throw new InvalidTransitionError(task.status, toStatus, getNextStatus(task.status));
      }

      const now = new Date().toISOString();
      this.repository.updateStatus(taskId, toStatus, now);
      this.auditLogs.record({
        taskId,
        actor,
        fromStatus: task.status,
        toStatus,
        timestamp: now,
      });

      return { ...task, status: toStatus, updatedAt: now };
    });
  }

  /** Soft delete: the task leaves the list, its audit log stays untouched. */
  deleteTask(taskId: string): void {
    const deleted = this.repository.softDelete(taskId, new Date().toISOString());
    if (!deleted) {
      throw new TaskNotFoundError(taskId);
    }
  }

  /** Passes for deleted tasks too, because their history stays readable. */
  assertExists(taskId: string): void {
    if (!this.repository.exists(taskId)) {
      throw new TaskNotFoundError(taskId);
    }
  }
}
