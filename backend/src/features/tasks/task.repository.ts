import type { Db } from "../../core/database";
import type { TaskStatus } from "../../core/task-status";
import type { Task } from "./task.types";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

const TASK_COLUMNS = "id, title, description, status, created_at, updated_at";

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All SQL for the `tasks` table. */
export class TaskRepository {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  findAll(): Task[] {
    return this.db
      .prepare<[], TaskRow>(
        `SELECT ${TASK_COLUMNS} FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC`,
      )
      .all()
      .map(toTask);
  }

  findById(id: string): Task | undefined {
    const row = this.db
      .prepare<[string], TaskRow>(
        `SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? AND deleted_at IS NULL`,
      )
      .get(id);
    return row && toTask(row);
  }

  /** True for any task that was ever created, including deleted ones. */
  exists(id: string): boolean {
    return this.db.prepare<[string]>("SELECT 1 FROM tasks WHERE id = ?").get(id) !== undefined;
  }

  insert(task: Task): void {
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, status, created_at, updated_at)
         VALUES (@id, @title, @description, @status, @createdAt, @updatedAt)`,
      )
      .run(task);
  }

  updateDetails(id: string, title: string, description: string | null, updatedAt: string): void {
    this.db
      .prepare("UPDATE tasks SET title = ?, description = ?, updated_at = ? WHERE id = ?")
      .run(title, description, updatedAt, id);
  }

  updateStatus(id: string, status: TaskStatus, updatedAt: string): void {
    this.db
      .prepare("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, updatedAt, id);
  }

  softDelete(id: string, deletedAt: string): void {
    this.db.prepare("UPDATE tasks SET deleted_at = ? WHERE id = ?").run(deletedAt, id);
  }
}
