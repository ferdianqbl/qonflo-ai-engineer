import { request } from "../../core/http";
import type { TaskStatus } from "../../core/task-status";
import type { Task, TaskInput, UpdateTaskStatusRequest } from "./task.types";

// One function per task endpoint. Every write names the acting user.
export const taskApi = {
  list: () => request<Task[]>("/tasks"),

  create: (input: TaskInput, actor: string) =>
    request<Task>("/tasks", { method: "POST", body: input, actor }),

  update: (taskId: string, input: TaskInput, actor: string) =>
    request<Task>(`/tasks/${taskId}`, { method: "PUT", body: input, actor }),

  changeStatus: (taskId: string, status: TaskStatus, actor: string) => {
    const body: UpdateTaskStatusRequest = { status };
    return request<Task>(`/tasks/${taskId}/status`, { method: "PATCH", body, actor });
  },

  remove: (taskId: string, actor: string) =>
    request<void>(`/tasks/${taskId}`, { method: "DELETE", actor }),
};
