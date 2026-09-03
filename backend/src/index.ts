import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { migrate } from "./db/migrate.js";
import { pool, waitForDatabase } from "./db/pool.js";

async function main() {
  await waitForDatabase();
  await migrate();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`MDIS API listening on http://localhost:${env.port}`);
    console.log(`AI provider: ${env.aiProvider}`);
  });

  const shutdown = async () => {
    server.close();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
