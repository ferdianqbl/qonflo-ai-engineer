// These two types mirror the backend's `core/errors.ts`.
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "TASK_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

/** A non-2xx answer from the API, carrying the backend's own error code and message. */
export class ApiError extends Error {
  readonly httpStatus: number;
  readonly code: ApiErrorCode;

  constructor(httpStatus: number, code: ApiErrorCode, message: string) {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Who is acting. Sent as the `X-Actor` header; the backend requires it on every write. */
  actor?: string;
}

/** The one place that calls `fetch`. Every feature's `*.api.ts` goes through it. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, actor } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (actor) {
    headers["X-Actor"] = actor;
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as ApiErrorResponse | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? `Request failed with status ${response.status}`,
    );
  }
  return payload as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Could not reach the server. Is the backend running?";
}
