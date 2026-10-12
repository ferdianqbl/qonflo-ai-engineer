import { createApp } from "./app";
import { config } from "./core/config";
import { openDatabase } from "./core/database";

const db = openDatabase(config.databasePath);
const app = createApp(db);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} (database: ${config.databasePath})`);
});
