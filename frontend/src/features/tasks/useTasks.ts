import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../../core/http";
import type { TaskStatus } from "../../core/task-status";
import { taskApi } from "./task.api";
import type { Task, TaskInput } from "./task.types";

/**
 * Owns the task list. Every write is made on behalf of `actor`.
 *
 * The server is the source of truth: after a change the list takes what the server returned,
 * and when the server rejects a change the list is reloaded. Each action resolves to true on
 * success so a caller can, for example, clear or close its form.
 */
export function useTasks(actor: string) {
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

  async function run(write: () => Promise<void>): Promise<boolean> {
    try {
      await write();
      setError(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      // What is on screen may be stale (e.g. someone else already changed the task) — resync.
      await reload();
      return false;
    }
  }

  function replaceTask(updated: Task) {
    setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
  }

  return {
    tasks,
    loading,
    error,
    dismissError: () => setError(null),

    createTask: (input: TaskInput) =>
      run(async () => {
        const created = await taskApi.create(input, actor);
        setTasks((current) => [created, ...current]);
      }),

    updateTask: (taskId: string, input: TaskInput) =>
      run(async () => replaceTask(await taskApi.update(taskId, input, actor))),

    changeStatus: (taskId: string, status: TaskStatus) =>
      run(async () => replaceTask(await taskApi.changeStatus(taskId, status, actor))),

    deleteTask: (taskId: string) =>
      run(async () => {
        await taskApi.remove(taskId, actor);
        setTasks((current) => current.filter((task) => task.id !== taskId));
      }),
  };
}
