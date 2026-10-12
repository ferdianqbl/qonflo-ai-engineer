import { Router, type Request } from "express";
import type { AuditLogService } from "./audit-log.service";

// Read-only on purpose: GET is the only method either router answers.

/** GET /api/audit-logs — the history of every task. */
export function createAuditLogRouter(service: AuditLogService): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(service.listAll());
  });

  return router;
}

/**
 * GET /api/tasks/:id/audit-logs — the history of one task.
 * Mounted by the task router under /tasks/:id, hence `mergeParams`.
 */
export function createTaskAuditLogRouter(service: AuditLogService): Router {
  const router = Router({ mergeParams: true });

  router.get("/", (req: Request<{ id: string }>, res) => {
    res.json(service.listForTask(req.params.id));
  });

  return router;
}
