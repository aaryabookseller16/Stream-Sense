/**
 * StreamSense Reactor - Worker
 *
 * Purpose:
 * - Consume events from Kafka in (near) real-time
 * - Aggregate simple KPIs (counts, rolling averages)
 * - Persist results into Postgres so the frontend/dashboard can query it
 *
 * This is the "streaming analytics" part of the system.
 */

import { pool, query } from "./db.js";
import { KAFKA_BROKERS, KAFKA_GROUP_ID, KAFKA_TOPIC, startConsumer } from "./kafka.js";

/**
 * Environment configuration (kept simple on purpose).
 * In docker-compose we will set these values.
 */
const SERVICE_NAME = process.env.SERVICE_NAME || "unknown-service";

/**
 * In-memory rolling stats (toy but interview-friendly).
 * In a real system you'd likely use windowed state in a stream processor,
 * Redis, or a proper time-series DB — but this is good enough to demonstrate
 * the architecture end-to-end.
 */
let totalEvents = 0;
let errorEvents = 0;

// Simple rolling average of latency_ms using incremental mean
let latencyCount = 0;
let avgLatencyMs = 0;

function updateRollingLatency(latencyMs) {
  latencyCount += 1;
  avgLatencyMs += (latencyMs - avgLatencyMs) / latencyCount;
}

/**
 * Write current KPI snapshot into Postgres.
 * We store the latest KPI values as rows in the kpis table (metric_name, metric_value, updated_at).
 */
async function upsertKpis() {
  // Our current DB schema is a simple key/value table:
  // kpis(metric_name TEXT, metric_value DOUBLE PRECISION, updated_at TIMESTAMPTZ)
  // So we write 1 row per metric on each flush.

  const metrics = [
    [`${SERVICE_NAME}.total_events`, totalEvents],
    [`${SERVICE_NAME}.error_events`, errorEvents],
    [`${SERVICE_NAME}.avg_latency_ms`, Number(avgLatencyMs.toFixed(2))],
  ];

  // Single multi-row insert (updated_at defaults to now())
  await query(
    `
    INSERT INTO kpis (metric_name, metric_value)
    VALUES ($1, $2), ($3, $4), ($5, $6)
    `,
    [
      metrics[0][0],
      metrics[0][1],
      metrics[1][0],
      metrics[1][1],
      metrics[2][0],
      metrics[2][1],
    ]
  );
}

/**
 * Parse raw Kafka message into a normalized event shape.
 * Expected example payload:
 * {
 *   "service": "api",
 *   "type": "request",
 *   "status": "ok" | "error",
 *   "latency_ms": 123
 * }
 */
function parseEvent(messageValue) {
  const raw = JSON.parse(messageValue);

  return {
    service: raw.service || SERVICE_NAME,
    status: raw.status || "ok",
    latency_ms: typeof raw.latency_ms === "number" ? raw.latency_ms : null,
  };
}

async function main() {
  console.log("Worker starting...");
  console.log("Kafka brokers:", KAFKA_BROKERS.join(", "));
  console.log("Kafka topic:", KAFKA_TOPIC);
  console.log("Group ID:", KAFKA_GROUP_ID);
  console.log("Service name:", SERVICE_NAME);

  // Periodically persist KPI snapshot (every 5 seconds)
  const flushInterval = setInterval(() => {
    upsertKpis().catch((err) => console.error("Failed to upsert KPIs:", err));
  }, 5000);

  // Consume messages (Kafka wiring is in kafka.js)
  const consumer = await startConsumer(async ({ message }) => {
    if (!message?.value) return;

    try {
      const evt = parseEvent(message.value.toString());

      totalEvents += 1;
      if (evt.status === "error") errorEvents += 1;
      if (evt.latency_ms !== null) updateRollingLatency(evt.latency_ms);
    } catch (err) {
      // If parsing fails, count it as an error event
      errorEvents += 1;
      console.error("Bad event payload:", err);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down worker...");
    clearInterval(flushInterval);
    await consumer.disconnect();
    await pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
