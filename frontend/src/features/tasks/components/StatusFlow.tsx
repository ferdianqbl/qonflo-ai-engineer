import { STATUS_LABELS } from "../../../core/status-labels";
import { TASK_STATUSES, type TaskStatus } from "../../../core/task-status";

/** The four steps of the flow, with the steps already passed and the current one marked. */
export function StatusFlow({ current }: { current: TaskStatus }) {
  const currentIndex = TASK_STATUSES.indexOf(current);

  return (
    <ol className="flow" aria-label="Status flow">
      {TASK_STATUSES.map((status, index) => {
        const state = index < currentIndex ? "past" : index === currentIndex ? "current" : "next";
        return (
          <li
            key={status}
            className={`flow__step flow__step--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            {STATUS_LABELS[status]}
          </li>
        );
      })}
    </ol>
  );
}
