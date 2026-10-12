import { randomUUID } from "node:crypto";
import type { RunInTransaction } from "../../core/database";
import { InvalidTransitionError, TaskNotFoundError } from "../../core/errors";
import {
  canTransition,
  getNextStatus,
  INITIAL_STATUS,
  type TaskStatus,
} from "../../core/task-status";
import type { ActorService } from "../actors/actor.service";
import type { AuditLogService } from "../audit-logs/audit-log.service";
import type { AuditAction, NewAuditLog } from "../audit-logs/audit-log.types";
import type { TaskRepository } from "./task.repository";
import type { Task, TaskInput } from "./task.types";

type FieldChange = Pick<NewAuditLog, "field" | "fromValue" | "toValue">;

/**
 * Business rules for tasks. Knows nothing about HTTP or SQL.
 *
 * Every write follows the same pattern: check the actor, then do the change and record it in
 * the audit log inside one transaction. The task and its history therefore cannot drift apart:
 * if the log entry cannot be written, the change is rolled back too.
 */
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

  createTask(input: TaskInput, actor: string): Task {
    this.actors.assertKnownActor(actor);

    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description || null,
      status: INITIAL_STATUS,
      createdAt: now,
      updatedAt: now,
    };

    return this.runInTransaction(() => {
      this.repository.insert(task);
      this.record(task, actor, now, "created");
      return task;
    });
  }

  /** Edits title and description, and records one audit entry per field that really changed. */
  updateTask(taskId: string, input: TaskInput, actor: string): Task {
    this.actors.assertKnownActor(actor);

    return this.runInTransaction(() => {
      const task = this.findActiveTask(taskId);
      const title = input.title;
      const description = input.description || null;

      const changes: FieldChange[] = [];
      if (title !== task.title) {
        changes.push({ field: "title", fromValue: task.title, toValue: title });
      }
      if (description !== task.description) {
        changes.push({ field: "description", fromValue: task.description, toValue: description });
      }

      // Idempotent: saving the values the task already has changes nothing and logs nothing.
      if (changes.length === 0) {
        return task;
      }

      const now = new Date().toISOString();
      this.repository.updateDetails(taskId, title, description, now);
      for (const change of changes) {
        this.record(task, actor, now, "updated", change);
      }

      return { ...task, title, description, updatedAt: now };
    });
  }

  /** Moves a task to `toStatus`, which must be the next step of the flow. */
  changeStatus(taskId: string, toStatus: TaskStatus, actor: string): Task {
    this.actors.assertKnownActor(actor);

    return this.runInTransaction(() => {
      const task = this.findActiveTask(taskId);

      // Idempotent: asking for the status the task already has changes nothing and logs nothing.
      if (task.status === toStatus) {
        return task;
      }

      if (!canTransition(task.status, toStatus)) {
        throw new InvalidTransitionError(task.status, toStatus, getNextStatus(task.status));
      }

      const now = new Date().toISOString();
      this.repository.updateStatus(taskId, toStatus, now);
      this.record(task, actor, now, "status_changed", {
        field: "status",
        fromValue: task.status,
        toValue: toStatus,
      });

      return { ...task, status: toStatus, updatedAt: now };
    });
  }

  /** Soft delete: the task leaves the list, its history stays and gains a "deleted" entry. */
  deleteTask(taskId: string, actor: string): void {
    this.actors.assertKnownActor(actor);

    this.runInTransaction(() => {
      const task = this.findActiveTask(taskId);
      const now = new Date().toISOString();
      this.repository.softDelete(taskId, now);
      this.record(task, actor, now, "deleted");
    });
  }

  /** Passes for deleted tasks too, because their history stays readable. */
  assertExists(taskId: string): void {
    if (!this.repository.exists(taskId)) {
      throw new TaskNotFoundError(taskId);
    }
  }

  private findActiveTask(taskId: string): Task {
    const task = this.repository.findById(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }
    return task;
  }

  /** `task` is the task as it was when the actor acted, so the entry keeps the title it had then. */
  private record(
    task: Task,
    actor: string,
    timestamp: string,
    action: AuditAction,
    change: FieldChange = { field: null, fromValue: null, toValue: null },
  ): void {
    this.auditLogs.record({
      taskId: task.id,
      taskTitle: task.title,
      actor,
      action,
      ...change,
      timestamp,
    });
  }
}
