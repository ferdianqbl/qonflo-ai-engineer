import { fileURLToPath } from "node:url";

// API_PORT rather than the generic PORT: both servers start from one command, and a PORT set by
// the environment would otherwise be claimed by the API and the Vite dev server alike.
export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  databasePath:
    process.env.DATABASE_PATH ?? fileURLToPath(new URL("../../data/tasks.db", import.meta.url)),
};
