import type { TaskStatus } from "../../core/task-status";

/**
 * The task part of the API contract. This file is kept identical in the `features/tasks`
 * folder of the backend and of the frontend. Timestamps are ISO 8601 strings in UTC.
 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  actor: string;
}
