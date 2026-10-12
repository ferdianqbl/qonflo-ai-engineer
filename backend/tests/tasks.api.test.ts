import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { createTransactionRunner, openDatabase, type Db } from "../src/core/database";
import type { TaskStatus } from "../src/core/task-status";
import { ActorRepository } from "../src/features/actors/actor.repository";
import { ActorService } from "../src/features/actors/actor.service";
import { AuditLogRepository } from "../src/features/audit-logs/audit-log.repository";
import { AuditLogService } from "../src/features/audit-logs/audit-log.service";
import type { AuditLog } from "../src/features/audit-logs/audit-log.types";
import { TaskRepository } from "../src/features/tasks/task.repository";
import { TaskService } from "../src/features/tasks/task.service";
import type { Task } from "../src/features/tasks/task.types";

let db: Db;
let app: Express;

beforeEach(() => {
  db = openDatabase(":memory:");
  app = createApp(db);
});

async function createTask(title = "Prepare Invoice"): Promise<Task> {
  const response = await request(app).post("/api/tasks").send({ title }).expect(201);
  return response.body;
}

function changeStatus(taskId: string, status: string, actor = "john.doe") {
  return request(app).patch(`/api/tasks/${taskId}/status`).send({ status, actor });
}

async function getAuditLogs(taskId: string): Promise<AuditLog[]> {
  const response = await request(app).get(`/api/tasks/${taskId}/audit-logs`).expect(200);
  return response.body;
}

describe("actors", () => {
  it("lists the predefined users for the dropdown", async () => {
    const response = await request(app).get("/api/actors").expect(200);

    expect(response.body).toEqual(["john.doe", "jane.smith", "budi.santoso"]);
  });
});

describe("tasks", () => {
  it("creates a task in to_do and lists it", async () => {
    const response = await request(app)
      .post("/api/tasks")
      .send({ title: "  Prepare Invoice  ", description: "For client A" })
      .expect(201);

    expect(response.body).toMatchObject({
      title: "Prepare Invoice",
      description: "For client A",
      status: "to_do",
    });
    expect(response.body.createdAt).toBe(response.body.updatedAt);

    const list = await request(app).get("/api/tasks").expect(200);
    expect(list.body).toEqual([response.body]);
  });

  it("rejects a task without a title", async () => {
    const response = await request(app).post("/api/tasks").send({ title: "   " }).expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("removes a deleted task from the list", async () => {
    const task = await createTask();

    await request(app).delete(`/api/tasks/${task.id}`).expect(204);

    const list = await request(app).get("/api/tasks").expect(200);
    expect(list.body).toEqual([]);
    await request(app).delete(`/api/tasks/${task.id}`).expect(404);
  });
});

describe("status changes", () => {
  it("moves a task one step forward and records who did it", async () => {
    const task = await createTask();

    const response = await changeStatus(task.id, "pending", "jane.smith").expect(200);

    expect(response.body.status).toBe("pending");
    expect(await getAuditLogs(task.id)).toEqual([
      {
        id: expect.any(Number),
        taskId: task.id,
        actor: "jane.smith",
        fromStatus: "to_do",
        toStatus: "pending",
        timestamp: response.body.updatedAt,
      },
    ]);
  });

  it("returns the audit log in chronological order", async () => {
    const task = await createTask();

    await changeStatus(task.id, "pending", "john.doe").expect(200);
    await changeStatus(task.id, "in_progress", "jane.smith").expect(200);
    await changeStatus(task.id, "done", "budi.santoso").expect(200);

    const logs = await getAuditLogs(task.id);
    expect(logs.map((log) => `${log.actor}: ${log.fromStatus} → ${log.toStatus}`)).toEqual([
      "john.doe: to_do → pending",
      "jane.smith: pending → in_progress",
      "budi.santoso: in_progress → done",
    ]);
  });

  it("is idempotent: setting the current status again writes no audit log", async () => {
    const task = await createTask();
    const first = await changeStatus(task.id, "pending").expect(200);

    const repeat = await changeStatus(task.id, "pending", "jane.smith").expect(200);

    expect(repeat.body).toEqual(first.body);
    expect(await getAuditLogs(task.id)).toHaveLength(1);
  });

  it.each<[string, TaskStatus[], TaskStatus]>([
    ["skipping a step", [], "in_progress"],
    ["jumping to the end", [], "done"],
    ["going backwards", ["pending", "in_progress"], "pending"],
    ["reopening a finished task", ["pending", "in_progress", "done"], "to_do"],
  ])("rejects %s without changing anything", async (_name, setup, target) => {
    const task = await createTask();
    for (const status of setup) {
      await changeStatus(task.id, status).expect(200);
    }

    const response = await changeStatus(task.id, target).expect(409);

    expect(response.body.error.code).toBe("INVALID_TRANSITION");
    const list = await request(app).get("/api/tasks");
    expect(list.body[0].status).toBe(setup.at(-1) ?? "to_do");
    expect(await getAuditLogs(task.id)).toHaveLength(setup.length);
  });

  it("rejects an unknown status or an actor that is not on the predefined list", async () => {
    const task = await createTask();

    const badStatus = await changeStatus(task.id, "archived").expect(400);
    const badActor = await changeStatus(task.id, "pending", "mallory").expect(400);

    expect(badStatus.body.error.code).toBe("VALIDATION_ERROR");
    expect(badActor.body.error.code).toBe("VALIDATION_ERROR");
    expect(await getAuditLogs(task.id)).toEqual([]);
  });

  it("returns 404 for a task that does not exist or was deleted", async () => {
    const task = await createTask();
    await request(app).delete(`/api/tasks/${task.id}`).expect(204);

    await changeStatus("missing-id", "pending").expect(404);
    await changeStatus(task.id, "pending").expect(404);
  });
});

describe("audit log integrity", () => {
  it("returns 404 for the audit log of a task that never existed", async () => {
    const response = await request(app).get("/api/tasks/missing-id/audit-logs").expect(404);

    expect(response.body.error.code).toBe("TASK_NOT_FOUND");
  });

  it("keeps the audit log readable after its task is deleted", async () => {
    const task = await createTask();
    await changeStatus(task.id, "pending").expect(200);

    await request(app).delete(`/api/tasks/${task.id}`).expect(204);

    expect(await getAuditLogs(task.id)).toHaveLength(1);
  });

  it("exposes no way to modify or delete audit logs over HTTP", async () => {
    const task = await createTask();
    await changeStatus(task.id, "pending").expect(200);

    await request(app).put(`/api/tasks/${task.id}/audit-logs`).send([]).expect(404);
    await request(app).delete(`/api/tasks/${task.id}/audit-logs`).expect(404);
    await request(app).delete(`/api/tasks/${task.id}/audit-logs/1`).expect(404);
  });

  it("makes the database itself refuse UPDATE and DELETE on audit_logs", async () => {
    const task = await createTask();
    await changeStatus(task.id, "pending").expect(200);

    expect(() => db.prepare("UPDATE audit_logs SET actor = 'someone.else'").run()).toThrow(
      /append-only/,
    );
    expect(() => db.prepare("DELETE FROM audit_logs").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id)).toThrow(/FOREIGN KEY/);
    expect(await getAuditLogs(task.id)).toHaveLength(1);
  });

  it("rolls the status change back when the audit log cannot be written", async () => {
    class FailingAuditLogRepository extends AuditLogRepository {
      override insert(): void {
        throw new Error("disk full");
      }
    }
    const service = new TaskService(
      new TaskRepository(db),
      new AuditLogService(new FailingAuditLogRepository(db)),
      new ActorService(new ActorRepository()),
      createTransactionRunner(db),
    );
    const task = service.createTask({ title: "Prepare Invoice" });

    expect(() => service.changeStatus(task.id, { status: "pending", actor: "john.doe" })).toThrow(
      "disk full",
    );

    expect(service.listTasks()[0]?.status).toBe("to_do");
    expect(await getAuditLogs(task.id)).toEqual([]);
  });
});
