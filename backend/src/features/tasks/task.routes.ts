import { Router, type Request } from "express";
import { parseBody } from "../../core/validation";
import { createTaskSchema, updateTaskStatusSchema } from "./task.schemas";
import type { TaskService } from "./task.service";

/** HTTP layer: validate the request, call the service, shape the response. */
export function createTaskRouter(service: TaskService, auditLogRouter: Router): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(service.listTasks());
  });

  router.post("/", (req, res) => {
    const input = parseBody(createTaskSchema, req.body);
    res.status(201).json(service.createTask(input));
  });

  router.patch("/:id/status", (req, res) => {
    const input = parseBody(updateTaskStatusSchema, req.body);
    res.json(service.changeStatus(req.params.id, input));
  });

  router.delete("/:id", (req, res) => {
    service.deleteTask(req.params.id);
    res.status(204).end();
  });

  // A task's history is nested under the task. This router only checks that the task exists
  // (deleted ones included), then hands over to the audit-log feature's own router.
  router.use(
    "/:id/audit-logs",
    (req: Request<{ id: string }>, _res, next) => {
      service.assertExists(req.params.id);
      next();
    },
    auditLogRouter,
  );

  return router;
}
