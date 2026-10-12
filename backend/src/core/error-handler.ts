import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, type ApiErrorCode, type ApiErrorResponse } from "./errors";

function errorBody(code: ApiErrorCode, message: string): ApiErrorResponse {
  return { error: { code, message } };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(errorBody("NOT_FOUND", `No route for ${req.method} ${req.path}`));
};

/** Every error leaves the API in the same `{ error: { code, message } }` shape. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json(errorBody(err.code, err.message));
    return;
  }

  // Thrown by express.json() when the body is not valid JSON.
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json(errorBody("VALIDATION_ERROR", "Request body is not valid JSON"));
    return;
  }

  console.error(err);
  res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong"));
};
