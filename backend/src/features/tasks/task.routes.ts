import { Router, type Request } from "express";
import { parseBody } from "../../core/validation";
import { taskInputSchema, updateTaskStatusSchema } from "./task.schemas";
import type { TaskService } from "./task.service";

/**
 * Who is making the request. There is no login, so the client names the acting user in the
 * `X-Actor` header of every write; the service rejects a name that is not on the user list.
 */
function actorOf(req: { header(name: string): string | undefined }): string {
  return req.header("x-actor") ?? "";
}

/** HTTP layer: validate the request, call the service, shape the response. */
export function createTaskRouter(service: TaskService, taskAuditLogRouter: Router): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(service.listTasks());
  });

  router.post("/", (req, res) => {
    const input = parseBody(taskInputSchema, req.body);
    res.status(201).json(service.createTask(input, actorOf(req)));
  });

  router.put("/:id", (req, res) => {
    const input = parseBody(taskInputSchema, req.body);
    res.json(service.updateTask(req.params.id, input, actorOf(req)));
  });

  router.patch("/:id/status", (req, res) => {
    const { status } = parseBody(updateTaskStatusSchema, req.body);
    res.json(service.changeStatus(req.params.id, status, actorOf(req)));
  });

  router.delete("/:id", (req, res) => {
    service.deleteTask(req.params.id, actorOf(req));
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
    taskAuditLogRouter,
  );

  return router;
}
