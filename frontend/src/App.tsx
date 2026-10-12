import { ActorSelect } from "./features/actors/components/ActorSelect";
import { useActors } from "./features/actors/useActors";
import { TaskForm } from "./features/tasks/components/TaskForm";
import { TaskList } from "./features/tasks/components/TaskList";
import { useTasks } from "./features/tasks/useTasks";

/** Page layout. Connects the features: the actor chosen in one is passed to the other. */
export function App() {
  const { actors, actor, setActor, error: actorsError } = useActors();
  const { tasks, loading, error, dismissError, createTask, changeStatus, deleteTask } = useTasks();

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Mini Task Manager</h1>
          <p>Every status change is recorded with who made it and when.</p>
        </div>
        <ActorSelect actors={actors} value={actor} onChange={setActor} />
      </header>

      {actorsError && (
        <div className="alert" role="alert">
          Could not load the user list: {actorsError}
        </div>
      )}
      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button className="button button--quiet" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}

      <TaskForm onCreate={createTask} />

      <TaskList
        tasks={tasks}
        loading={loading}
        actor={actor}
        onChangeStatus={changeStatus}
        onDelete={deleteTask}
      />
    </div>
  );
}
