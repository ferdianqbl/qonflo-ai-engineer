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
import type { AuditLog, NewAuditLog } from "../src/features/audit-logs/audit-log.types";
import { TaskRepository } from "../src/features/tasks/task.repository";
import { TaskService } from "../src/features/tasks/task.service";
import type { Task, TaskInput } from "../src/features/tasks/task.types";

let db: Db;
let app: Express;

beforeEach(() => {
  db = openDatabase(":memory:");
  app = createApp(db);
});

// Each helper sends the acting user in the X-Actor header, like the frontend does.

function postTask(input: Partial<TaskInput>, actor = "john.doe") {
  return request(app).post("/api/tasks").set("X-Actor", actor).send(input);
}

async function createTask(title = "Prepare Invoice", description?: string): Promise<Task> {
  const response = await postTask({ title, description }).expect(201);
  return response.body;
}

function updateTask(taskId: string, input: Partial<TaskInput>, actor = "john.doe") {
  return request(app).put(`/api/tasks/${taskId}`).set("X-Actor", actor).send(input);
}

function changeStatus(taskId: string, status: string, actor = "john.doe") {
  return request(app).patch(`/api/tasks/${taskId}/status`).set("X-Actor", actor).send({ status });
}

function deleteTask(taskId: string, actor = "john.doe") {
  return request(app).delete(`/api/tasks/${taskId}`).set("X-Actor", actor);
}

async function listTasks(): Promise<Task[]> {
  const response = await request(app).get("/api/tasks").expect(200);
  return response.body;
}

async function getAuditLogs(taskId: string): Promise<AuditLog[]> {
  const response = await request(app).get(`/api/tasks/${taskId}/audit-logs`).expect(200);
  return response.body;
}

/** "john.doe status_changed status: to_do → pending" — compact form for comparing histories. */
function summarize(log: AuditLog): string {
  const change = log.field ? ` ${log.field}: ${log.fromValue} → ${log.toValue}` : "";
  return `${log.actor} ${log.action}${change}`;
}

describe("actors", () => {
  it("lists the predefined users for the dropdown", async () => {
    const response = await request(app).get("/api/actors").expect(200);

    expect(response.body).toEqual(["john.doe", "jane.smith", "budi.santoso"]);
  });
});

describe("creating and listing tasks", () => {
  it("creates a task in to_do, lists it, and records who created it", async () => {
    const response = await postTask(
      { title: "  Prepare Invoice  ", description: "For client A" },
      "jane.smith",
    ).expect(201);

    expect(response.body).toMatchObject({
      title: "Prepare Invoice",
      description: "For client A",
      status: "to_do",
    });
    expect(response.body.createdAt).toBe(response.body.updatedAt);
    expect(await listTasks()).toEqual([response.body]);
    expect(await getAuditLogs(response.body.id)).toEqual([
      {
        id: expect.any(Number),
        taskId: response.body.id,
        taskTitle: "Prepare Invoice",
        actor: "jane.smith",
        action: "created",
        field: null,
        fromValue: null,
        toValue: null,
        timestamp: response.body.createdAt,
      },
    ]);
  });

  it("rejects a task without a title", async () => {
    const response = await postTask({ title: "   " }).expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await listTasks()).toEqual([]);
  });
});

describe("updating a task", () => {
  it("changes title and description and records one entry per changed field", async () => {
    const task = await createTask("Prepare Invoice", "For client A");

    const response = await updateTask(
      task.id,
      { title: "Prepare Invoice Q4", description: "" },
      "jane.smith",
    ).expect(200);

    expect(response.body).toMatchObject({
      title: "Prepare Invoice Q4",
      description: null,
      status: "to_do",
    });
    expect((await listTasks())[0]).toEqual(response.body);

    const logs = await getAuditLogs(task.id);
    expect(logs.map(summarize)).toEqual([
      "john.doe created",
      "jane.smith updated title: Prepare Invoice → Prepare Invoice Q4",
      "jane.smith updated description: For client A → null",
    ]);
    // The entries keep the title the task had when the change was made.
    expect(logs[1]).toMatchObject({ taskTitle: "Prepare Invoice", timestamp: response.body.updatedAt });
  });

  it("records only the field that really changed", async () => {
    const task = await createTask("Prepare Invoice", "For client A");

    await updateTask(task.id, { title: "Prepare Invoice", description: "For client B" }).expect(200);

    expect((await getAuditLogs(task.id)).map(summarize)).toEqual([
      "john.doe created",
      "john.doe updated description: For client A → For client B",
    ]);
  });

  it("is idempotent: saving the same values writes no audit log", async () => {
    const task = await createTask("Prepare Invoice", "For client A");

    const response = await updateTask(
      task.id,
      { title: "Prepare Invoice", description: "For client A" },
      "jane.smith",
    ).expect(200);

    expect(response.body).toEqual(task);
    expect(await getAuditLogs(task.id)).toHaveLength(1);
  });

  it("rejects an empty title without changing anything", async () => {
    const task = await createTask();

    const response = await updateTask(task.id, { title: "" }).expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await listTasks()).toEqual([task]);
    expect(await getAuditLogs(task.id)).toHaveLength(1);
  });
});

describe("changing status", () => {
  it("moves a task one step forward and records who did it", async () => {
    const task = await createTask();

    const response = await changeStatus(task.id, "pending", "jane.smith").expect(200);

    expect(response.body.status).toBe("pending");
    expect((await getAuditLogs(task.id)).at(-1)).toEqual({
      id: expect.any(Number),
      taskId: task.id,
      taskTitle: "Prepare Invoice",
      actor: "jane.smith",
      action: "status_changed",
      field: "status",
      fromValue: "to_do",
      toValue: "pending",
      timestamp: response.body.updatedAt,
    });
  });

  it("is idempotent: setting the current status again writes no audit log", async () => {
    const task = await createTask();
    const first = await changeStatus(task.id, "pending").expect(200);

    const repeat = await changeStatus(task.id, "pending", "jane.smith").expect(200);

    expect(repeat.body).toEqual(first.body);
    expect(await getAuditLogs(task.id)).toHaveLength(2);
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
    expect((await listTasks())[0]?.status).toBe(setup.at(-1) ?? "to_do");
    expect(await getAuditLogs(task.id)).toHaveLength(1 + setup.length);
  });

  it("rejects a status that does not exist", async () => {
    const task = await createTask();

    const response = await changeStatus(task.id, "archived").expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await getAuditLogs(task.id)).toHaveLength(1);
  });
});

describe("deleting a task", () => {
  it("removes the task from the list and records who deleted it", async () => {
    const task = await createTask();

    await deleteTask(task.id, "budi.santoso").expect(204);

    expect(await listTasks()).toEqual([]);
    // The history is still readable after the task is gone, and ends with the deletion.
    expect((await getAuditLogs(task.id)).map(summarize)).toEqual([
      "john.doe created",
      "budi.santoso deleted",
    ]);
  });

  it("returns 404 for any further change to a deleted or unknown task", async () => {
    const task = await createTask();
    await deleteTask(task.id).expect(204);

    await deleteTask(task.id).expect(404);
    await updateTask(task.id, { title: "Renamed" }).expect(404);
    await changeStatus(task.id, "pending").expect(404);
    await changeStatus("missing-id", "pending").expect(404);
    expect(await getAuditLogs(task.id)).toHaveLength(2);
  });
});

describe("the acting user", () => {
  it.each<[string, (taskId: string, actor: string) => request.Test]>([
    ["create", (_taskId, actor) => postTask({ title: "Another task" }, actor)],
    ["update", (taskId, actor) => updateTask(taskId, { title: "Renamed" }, actor)],
    ["status change", (taskId, actor) => changeStatus(taskId, "pending", actor)],
    ["delete", (taskId, actor) => deleteTask(taskId, actor)],
  ])("rejects a %s by someone who is not on the predefined list", async (_name, write) => {
    const task = await createTask();

    const unknown = await write(task.id, "mallory").expect(400);
    const missing = await write(task.id, "").expect(400);

    expect(unknown.body.error.code).toBe("VALIDATION_ERROR");
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
    expect(await listTasks()).toEqual([task]);
    expect(await getAuditLogs(task.id)).toHaveLength(1);
  });
});

describe("history of all tasks", () => {
  it("returns every entry of every task in chronological order, deleted tasks included", async () => {
    const invoice = await createTask("Prepare Invoice");
    const contract = await createTask("Review Contract");
    await changeStatus(invoice.id, "pending", "jane.smith").expect(200);
    await updateTask(contract.id, { title: "Review Contract v2" }, "budi.santoso").expect(200);
    await deleteTask(invoice.id, "jane.smith").expect(204);

    const response = await request(app).get("/api/audit-logs").expect(200);
    const logs: AuditLog[] = response.body;

    expect(logs.map((log) => `${log.taskTitle} — ${summarize(log)}`)).toEqual([
      "Prepare Invoice — john.doe created",
      "Review Contract — john.doe created",
      "Prepare Invoice — jane.smith status_changed status: to_do → pending",
      "Review Contract — budi.santoso updated title: Review Contract → Review Contract v2",
      "Prepare Invoice — jane.smith deleted",
    ]);
  });

  it("returns the history of one task in chronological order", async () => {
    const task = await createTask();
    await createTask("Another task");

    await changeStatus(task.id, "pending", "john.doe").expect(200);
    await changeStatus(task.id, "in_progress", "jane.smith").expect(200);
    await changeStatus(task.id, "done", "budi.santoso").expect(200);

    expect((await getAuditLogs(task.id)).map(summarize)).toEqual([
      "john.doe created",
      "john.doe status_changed status: to_do → pending",
      "jane.smith status_changed status: pending → in_progress",
      "budi.santoso status_changed status: in_progress → done",
    ]);
  });

  it("returns 404 for the history of a task that never existed", async () => {
    const response = await request(app).get("/api/tasks/missing-id/audit-logs").expect(404);

    expect(response.body.error.code).toBe("TASK_NOT_FOUND");
  });
});

describe("audit log integrity", () => {
  it("exposes no way to modify or delete audit logs over HTTP", async () => {
    const task = await createTask();

    await request(app).put(`/api/tasks/${task.id}/audit-logs`).send([]).expect(404);
    await request(app).delete(`/api/tasks/${task.id}/audit-logs`).expect(404);
    await request(app).delete(`/api/tasks/${task.id}/audit-logs/1`).expect(404);
    await request(app).post("/api/audit-logs").send({}).expect(404);
    await request(app).delete("/api/audit-logs").expect(404);
    await request(app).delete("/api/audit-logs/1").expect(404);
  });

  it("makes the database itself refuse UPDATE and DELETE on audit_logs", async () => {
    const task = await createTask();
    await changeStatus(task.id, "pending").expect(200);

    expect(() => db.prepare("UPDATE audit_logs SET actor = 'someone.else'").run()).toThrow(
      /append-only/,
    );
    expect(() => db.prepare("DELETE FROM audit_logs").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id)).toThrow(/FOREIGN KEY/);
    expect(await getAuditLogs(task.id)).toHaveLength(2);
  });

  describe("when the audit log cannot be written", () => {
    /** Accepts `allowed` entries, then fails like a full disk would. */
    class FailingAuditLogRepository extends AuditLogRepository {
      allowed = 0;

      override insert(entry: NewAuditLog): void {
        if (this.allowed <= 0) {
          throw new Error("disk full");
        }
        this.allowed -= 1;
        super.insert(entry);
      }
    }

    let auditLogRepository: FailingAuditLogRepository;
    let service: TaskService;

    beforeEach(() => {
      auditLogRepository = new FailingAuditLogRepository(db);
      service = new TaskService(
        new TaskRepository(db),
        new AuditLogService(auditLogRepository),
        new ActorService(new ActorRepository()),
        createTransactionRunner(db),
      );
    });

    function createLoggedTask(): Task {
      auditLogRepository.allowed = 1;
      return service.createTask({ title: "Prepare Invoice" }, "john.doe");
    }

    it("does not create the task", () => {
      expect(() => service.createTask({ title: "Prepare Invoice" }, "john.doe")).toThrow(
        "disk full",
      );

      expect(service.listTasks()).toEqual([]);
    });

    it.each<[string, (taskId: string) => unknown]>([
      ["update", (taskId) => service.updateTask(taskId, { title: "Renamed" }, "john.doe")],
      ["status change", (taskId) => service.changeStatus(taskId, "pending", "john.doe")],
      ["delete", (taskId) => service.deleteTask(taskId, "john.doe")],
    ])("rolls the %s back", async (_name, write) => {
      const task = createLoggedTask();

      expect(() => write(task.id)).toThrow("disk full");

      expect(service.listTasks()).toEqual([task]);
      expect(await getAuditLogs(task.id)).toHaveLength(1);
    });
  });
});
