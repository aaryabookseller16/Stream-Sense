/*****************************************
 * Worker DB helper
 *
 * Why this exists:
 * - The worker runs as a separate service from the backend API.
 * - It needs its own DB connection code so it can write KPI snapshots to Postgres.
 *
 * Config:
 * - DATABASE_URL is provided via docker-compose.yml
 *   Example: postgresql://user:pass@db:5432/streamsense
 *****************************************/

import pg from "pg";

const { Pool } = pg;

// Fail fast if DATABASE_URL is missing (makes errors obvious in logs)
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL env var (worker cannot connect to Postgres).");
}

/**
 * Reusable connection pool.
 * - Pool manages TCP connections efficiently.
 * - This is safer than creating a new client for every query.
 */
export const pool = new Pool({
  connectionString: DATABASE_URL,
});

/**
 * Simple query helper.
 * - Keeps call sites clean: await query("SELECT 1", [])
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}
