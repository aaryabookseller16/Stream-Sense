

/**
 * Postgres connection pool
 *
 * Centralized database access layer for the backend API.
 * Other files import this instead of creating their own DB connections.
 *
 * This keeps:
 *  - connection management consistent
 *  - code easier to test
 *  - resource usage predictable
 */

import pg from "pg";

const { Pool } = pg;

// DATABASE_URL is injected via docker-compose
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Create a shared connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,              // max number of clients in the pool
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Optional: log unexpected pool errors
pool.on("error", (err) => {
  console.error("Unexpected Postgres error:", err);
  process.exit(1);
});

export default pool;