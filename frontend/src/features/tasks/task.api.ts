import { request } from "../../core/http";
import type { CreateTaskRequest, Task, UpdateTaskStatusRequest } from "./task.types";

// One function per task endpoint.
export const taskApi = {
  list: () => request<Task[]>("/tasks"),
  create: (input: CreateTaskRequest) => request<Task>("/tasks", "POST", input),
  changeStatus: (taskId: string, input: UpdateTaskStatusRequest) =>
    request<Task>(`/tasks/${taskId}/status`, "PATCH", input),
  remove: (taskId: string) => request<void>(`/tasks/${taskId}`, "DELETE"),
};
