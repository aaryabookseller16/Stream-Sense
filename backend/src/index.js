import { createApp } from "./app.js";
import pool from "./db/pool.js";

const port = Number(process.env.PORT || 8000);
const app = createApp({ pool });
const server = app.listen(port, () => {
  console.log(`[backend] listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`[backend] received ${signal}; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
