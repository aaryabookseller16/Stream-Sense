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

import { Kafka } from "kafkajs";
import pkg from "pg";
const { Pool } = pkg;

/**
 * Create a new pg Pool using DATABASE_URL from environment variables.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // You can add more pool options here if needed
});

/**
 * Environment configuration (kept simple on purpose).
 * In docker-compose we will set these values.
 */
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "events";
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || "streamsense-worker";
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
 * We store one row per (service_name, minute_bucket).
 */
async function upsertKpis() {
  const now = new Date();

  // Minute bucket like: 2026-01-20 12:34:00
  const minuteBucket = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0
  );

  const values = {
    total_events: totalEvents,
    error_events: errorEvents,
    avg_latency_ms: Number(avgLatencyMs.toFixed(2)),
  };

  await pool.query(
    `
    INSERT INTO kpis (service_name, minute_bucket, total_events, error_events, avg_latency_ms)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (service_name, minute_bucket)
    DO UPDATE SET
      total_events = EXCLUDED.total_events,
      error_events = EXCLUDED.error_events,
      avg_latency_ms = EXCLUDED.avg_latency_ms
    `,
    [
      SERVICE_NAME,
      minuteBucket.toISOString(),
      values.total_events,
      values.error_events,
      values.avg_latency_ms,
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

  // Kafka client + consumer
  const kafka = new Kafka({ clientId: "streamsense-worker", brokers: KAFKA_BROKERS });
  const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });

  // Periodically persist KPI snapshot (every 5 seconds)
  const flushInterval = setInterval(() => {
    upsertKpis().catch((err) => console.error("Failed to upsert KPIs:", err));
  }, 5000);

  // Consume messages
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

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
    },
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
