import { z } from "zod";
import { TASK_STATUSES } from "../../core/task-status";

// Shape only. Who is acting comes from the X-Actor header and is checked by the service.

/** Body of both "create task" and "update task". */
export const taskInputSchema = z.object({
  title: z
    .string({ error: "must be a non-empty string" })
    .trim()
    .min(1, "must be a non-empty string")
    .max(200, "must be at most 200 characters"),
  description: z.string().trim().max(2000, "must be at most 2000 characters").optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES, { error: `must be one of: ${TASK_STATUSES.join(", ")}` }),
});
