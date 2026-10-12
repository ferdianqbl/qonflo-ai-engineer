/**
 * The status flow. This file is kept identical in `backend/src/core` and `frontend/src/core`:
 * the backend uses it to validate a transition, the frontend to decide which action to offer.
 */
export const TASK_STATUSES = ["to_do", "pending", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const INITIAL_STATUS: TaskStatus = "to_do";

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

/** The only status a task may move to from `status`, or null when the flow has ended. */
export function getNextStatus(status: TaskStatus): TaskStatus | null {
  return TASK_STATUSES[TASK_STATUSES.indexOf(status) + 1] ?? null;
}

/** A transition is valid only when it moves exactly one step forward. */
export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return getNextStatus(from) === to;
}
