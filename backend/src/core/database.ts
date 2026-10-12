import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { TASK_STATUSES } from "./task-status";

export type Db = Database.Database;

/** Runs `fn` atomically: either every write inside it is committed, or none is. */
export type RunInTransaction = <T>(fn: () => T) => T;

const STATUS_LIST = TASK_STATUSES.map((status) => `'${status}'`).join(", ");

/**
 * - Tasks are soft-deleted (`deleted_at`), so the row an audit log points to never disappears.
 * - `audit_logs` holds one row per action. For a change, `field`, `from_value` and `to_value`
 *   say what changed; `task_title` keeps the title the task had at that moment.
 * - `audit_logs` is append-only: the two triggers make the database itself reject any
 *   UPDATE or DELETE, whatever code issues it.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL CHECK (status IN (${STATUS_LIST})),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     TEXT NOT NULL REFERENCES tasks(id),
    task_title  TEXT NOT NULL,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'deleted')),
    field       TEXT CHECK (field IN ('title', 'description', 'status')),
    from_value  TEXT,
    to_value    TEXT,
    timestamp   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON audit_logs (task_id, id);

  CREATE TRIGGER IF NOT EXISTS audit_logs_block_update
  BEFORE UPDATE ON audit_logs
  BEGIN
    SELECT RAISE(ABORT, 'audit_logs is append-only: UPDATE is not allowed');
  END;

  CREATE TRIGGER IF NOT EXISTS audit_logs_block_delete
  BEFORE DELETE ON audit_logs
  BEGIN
    SELECT RAISE(ABORT, 'audit_logs is append-only: DELETE is not allowed');
  END;
`;

/** Opens (and creates if needed) the SQLite database. Pass ":memory:" for an isolated test database. */
export function openDatabase(path: string): Db {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/**
 * A feature that writes through more than one repository gets this instead of the database
 * itself, so its service can say "these writes belong together" without knowing any SQL.
 */
export function createTransactionRunner(db: Db): RunInTransaction {
  return (fn) => db.transaction(fn).immediate();
}
