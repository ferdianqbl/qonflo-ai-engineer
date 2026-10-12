import type { TaskStatus } from "../../../core/task-status";
import type { Task } from "../task.types";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  actor: string;
  onChangeStatus: (taskId: string, status: TaskStatus, actor: string) => Promise<boolean>;
  onDelete: (taskId: string) => Promise<boolean>;
}

export function TaskList({ tasks, loading, actor, onChangeStatus, onDelete }: TaskListProps) {
  return (
    <section>
      <h2>
        Tasks <span className="count">{tasks.length}</span>
      </h2>

      {loading && <p className="empty">Loading tasks…</p>}
      {!loading && tasks.length === 0 && (
        <p className="empty">No tasks yet. Create the first one above.</p>
      )}

      <ul className="task-list">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            actor={actor}
            onChangeStatus={onChangeStatus}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  );
}
