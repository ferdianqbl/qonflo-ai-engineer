import { useState } from "react";
import { ActorSelect } from "./features/actors/components/ActorSelect";
import { useActors } from "./features/actors/useActors";
import { AuditLogHistory } from "./features/audit-logs/components/AuditLogHistory";
import { TaskForm } from "./features/tasks/components/TaskForm";
import { TaskList } from "./features/tasks/components/TaskList";
import { useTasks } from "./features/tasks/useTasks";

type View = "tasks" | "history";

const VIEWS: { id: View; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "history", label: "History" },
];

/** Page layout. Connects the features: the actor chosen in one is who the other acts as. */
export function App() {
  const [view, setView] = useState<View>("tasks");
  const { actors, actor, setActor, error: actorsError } = useActors();
  const { tasks, loading, error, dismissError, createTask, updateTask, changeStatus, deleteTask } =
    useTasks(actor);

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Mini Task Manager</h1>
          <p>Every change is recorded with who made it and when.</p>
        </div>
        <ActorSelect actors={actors} value={actor} onChange={setActor} />
      </header>

      <nav className="tabs" aria-label="View">
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            className="tabs__tab"
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

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

      {view === "tasks" ? (
        <>
          <section className="card">
            <h2>New task</h2>
            <TaskForm submitLabel="Add task" disabled={!actor} onSubmit={createTask} />
          </section>

          <TaskList
            tasks={tasks}
            loading={loading}
            canAct={Boolean(actor)}
            onChangeStatus={changeStatus}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        </>
      ) : (
        // Mounted only while visible, so opening the tab always loads the latest history.
        <AuditLogHistory />
      )}
    </div>
  );
}
