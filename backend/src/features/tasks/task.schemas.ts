import { z } from "zod";
import { TASK_STATUSES } from "../../core/task-status";

const requiredText = (max: number) =>
  z
    .string({ error: "must be a non-empty string" })
    .trim()
    .min(1, "must be a non-empty string")
    .max(max, `must be at most ${max} characters`);

export const createTaskSchema = z.object({
  title: requiredText(200),
  description: z.string().trim().max(2000, "must be at most 2000 characters").optional(),
});

// Shape only. Whether `actor` is a known user is a rule, and is checked by the service.
export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES, { error: `must be one of: ${TASK_STATUSES.join(", ")}` }),
  actor: requiredText(100),
});
