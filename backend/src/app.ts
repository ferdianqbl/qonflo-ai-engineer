import express, { type Express } from "express";
import { createTransactionRunner, type Db } from "./core/database";
import { errorHandler, notFoundHandler } from "./core/error-handler";
import { ActorRepository } from "./features/actors/actor.repository";
import { createActorRouter } from "./features/actors/actor.routes";
import { ActorService } from "./features/actors/actor.service";
import { AuditLogRepository } from "./features/audit-logs/audit-log.repository";
import {
  createAuditLogRouter,
  createTaskAuditLogRouter,
} from "./features/audit-logs/audit-log.routes";
import { AuditLogService } from "./features/audit-logs/audit-log.service";
import { TaskRepository } from "./features/tasks/task.repository";
import { createTaskRouter } from "./features/tasks/task.routes";
import { TaskService } from "./features/tasks/task.service";

/**
 * Composition root: the only place that knows how the features fit together.
 * Takes the database as an argument so tests can pass an in-memory one.
 */
export function createApp(db: Db): Express {
  const actorService = new ActorService(new ActorRepository());
  const auditLogService = new AuditLogService(new AuditLogRepository(db));
  const taskService = new TaskService(
    new TaskRepository(db),
    auditLogService,
    actorService,
    createTransactionRunner(db),
  );

  const app = express();
  app.use(express.json());

  app.use("/api/actors", createActorRouter(actorService));
  app.use("/api/audit-logs", createAuditLogRouter(auditLogService));
  app.use("/api/tasks", createTaskRouter(taskService, createTaskAuditLogRouter(auditLogService)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
