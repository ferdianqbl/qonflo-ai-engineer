import { Router, type Request } from "express";
import type { AuditLogService } from "./audit-log.service";

/**
 * Read-only on purpose: GET is the only route this feature has.
 * The router is mounted by the task router under /tasks/:id/audit-logs, hence `mergeParams`.
 */
export function createAuditLogRouter(service: AuditLogService): Router {
  const router = Router({ mergeParams: true });

  router.get("/", (req: Request<{ id: string }>, res) => {
    res.json(service.listForTask(req.params.id));
  });

  return router;
}
