import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  query_timeout: 10_000,
});

pool.on("error", (error) => {
  console.error("[worker] unexpected PostgreSQL pool error", error);
});

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_kpis (
      minute_bucket TIMESTAMPTZ NOT NULL,
      service TEXT NOT NULL,
      event_count INTEGER NOT NULL CHECK (event_count >= 0),
      error_count INTEGER NOT NULL CHECK (error_count >= 0),
      avg_latency_ms DOUBLE PRECISION NOT NULL CHECK (avg_latency_ms >= 0),
      p95_latency_ms DOUBLE PRECISION NOT NULL CHECK (p95_latency_ms >= 0),
      last_event_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (minute_bucket, service)
    )
  `);
  await pool.query(`
    ALTER TABLE service_kpis
    ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
}

export async function upsertSnapshots(snapshots) {
  if (snapshots.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const snapshot of snapshots) {
      await client.query(
        `
          INSERT INTO service_kpis (
            minute_bucket,
            service,
            event_count,
            error_count,
            avg_latency_ms,
            p95_latency_ms,
            last_event_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (minute_bucket, service)
          DO UPDATE SET
            event_count = EXCLUDED.event_count,
            error_count = EXCLUDED.error_count,
            avg_latency_ms = EXCLUDED.avg_latency_ms,
            p95_latency_ms = EXCLUDED.p95_latency_ms,
            last_event_at = EXCLUDED.last_event_at,
            updated_at = NOW()
        `,
        [
          snapshot.minute_bucket,
          snapshot.service,
          snapshot.event_count,
          snapshot.error_count,
          snapshot.avg_latency_ms,
          snapshot.p95_latency_ms,
          snapshot.last_event_at,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
