import type { TaskStatus } from "./task-status";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "TASK_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

/** The body of every error response. The frontend mirrors these two types in `core/http.ts`. */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

/** An error the client is meant to see. Anything else is treated as a 500 by the error handler. */
export class AppError extends Error {
  readonly httpStatus: number;
  readonly code: ApiErrorCode;

  constructor(httpStatus: number, code: ApiErrorCode, message: string) {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, "VALIDATION_ERROR", message);
  }
}

export class TaskNotFoundError extends AppError {
  constructor(taskId: string) {
    super(404, "TASK_NOT_FOUND", `Task "${taskId}" was not found`);
  }
}

/** 409: the request is well-formed, but conflicts with the task's current status. */
export class InvalidTransitionError extends AppError {
  constructor(from: TaskStatus, to: TaskStatus, allowedNext: TaskStatus | null) {
    const hint = allowedNext
      ? `the only allowed next status is "${allowedNext}"`
      : `"${from}" is the final status`;
    super(409, "INVALID_TRANSITION", `Cannot change status from "${from}" to "${to}": ${hint}`);
  }
}
