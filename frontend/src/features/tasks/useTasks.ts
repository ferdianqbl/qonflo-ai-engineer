import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../../core/http";
import type { TaskStatus } from "../../core/task-status";
import { taskApi } from "./task.api";
import type { CreateTaskRequest, Task } from "./task.types";

/**
 * Owns the task list. The server is the source of truth: after every change the list is updated
 * with what the server returned, and when the server rejects a change the list is reloaded.
 * Each action resolves to true on success so a caller can, for example, clear its form.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setTasks(await taskApi.list());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createTask(input: CreateTaskRequest): Promise<boolean> {
    try {
      const created = await taskApi.create(input);
      setTasks((current) => [created, ...current]);
      setError(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  }

  async function changeStatus(taskId: string, status: TaskStatus, actor: string): Promise<boolean> {
    try {
      const updated = await taskApi.changeStatus(taskId, { status, actor });
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
      setError(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      // What is on screen was stale (e.g. someone else already moved the task) — resync.
      await reload();
      return false;
    }
  }

  async function deleteTask(taskId: string): Promise<boolean> {
    try {
      await taskApi.remove(taskId);
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setError(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      await reload();
      return false;
    }
  }

  return {
    tasks,
    loading,
    error,
    dismissError: () => setError(null),
    createTask,
    changeStatus,
    deleteTask,
  };
}
