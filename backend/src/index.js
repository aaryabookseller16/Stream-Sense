

/**
 * StreamSense Reactor – Backend API
 *
 * This service exposes a simple HTTP API used by:
 *  - the frontend dashboard (to fetch KPIs)
 *  - infrastructure tools (health checks)
 *
 * IMPORTANT DESIGN CHOICE:
 * This service does NOT consume Kafka directly.
 * All streaming ingestion + aggregation happens in the worker service.
 * The backend only reads already-aggregated data from Postgres.
 */

import express from "express";
import pg from "pg";

const { Pool } = pg;

// --- App & Config ------------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 8000;

// Database connection (provided via Docker Compose)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware to parse JSON bodies
app.use(express.json());

// --- Routes ------------------------------------------------------------------

/**
 * Health check endpoint
 * Used by Docker, load balancers, and humans.
 */
app.get("/health", async (req, res) => {
  try {
    // Simple DB ping to verify connectivity
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", error: "database unreachable" });
  }
});

/**
 * Fetch aggregated KPIs
 * (placeholder for now — worker will populate this table later)
 */
app.get("/kpis", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        metric_name,
        metric_value,
        updated_at
      FROM kpis
      ORDER BY updated_at DESC
      LIMIT 20
    `);

    res.json({
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    // Table may not exist yet — that's okay in early development
    res.json({
      count: 0,
      data: [],
      note: "KPI table not initialized yet",
    });
  }
});

// --- Startup -----------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`StreamSense backend running on port ${PORT}`);
});