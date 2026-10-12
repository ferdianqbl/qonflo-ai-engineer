import type { z } from "zod";
import { ValidationError } from "./errors";

/** Validates a request body, turning any problem into a 400 with a readable message. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"} ${issue.message}`)
      .join("; ");
    throw new ValidationError(message);
  }
  return result.data;
}
