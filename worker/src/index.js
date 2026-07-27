import { ensureSchema, pool, upsertSnapshots } from "./db.js";
import {
  KAFKA_BROKERS,
  KAFKA_GROUP_ID,
  KAFKA_TOPIC,
  startConsumer,
} from "./kafka.js";
import { MetricsStore, parseEvent } from "./metrics.js";

const serviceFallback = process.env.SERVICE_NAME || "unknown-service";
const flushIntervalMs = Number(process.env.FLUSH_INTERVAL_MS || 2_000);
const metrics = new MetricsStore();

let consumer;
let flushTimer;
let shuttingDown = false;
let flushInProgress = false;

async function flush() {
  if (flushInProgress) return;
  flushInProgress = true;
  try {
    const snapshots = metrics.snapshots({ dirtyOnly: true });
    await upsertSnapshots(snapshots);
    metrics.markPersisted(snapshots);
  } finally {
    flushInProgress = false;
  }
}

function scheduleFlush() {
  flushTimer = setTimeout(async () => {
    try {
      await flush();
    } catch (error) {
      console.error("[worker] metric flush failed", error);
    } finally {
      if (!shuttingDown) scheduleFlush();
    }
  }, flushIntervalMs);
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] received ${signal}; shutting down`);
  clearTimeout(flushTimer);

  try {
    if (consumer) {
      await consumer.stop();
      await consumer.disconnect();
    }
    await flush();
    await pool.end();
  } catch (error) {
    console.error("[worker] shutdown failed", error);
    exitCode = 1;
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

async function main() {
  console.log("[worker] starting", {
    brokers: KAFKA_BROKERS,
    topic: KAFKA_TOPIC,
    groupId: KAFKA_GROUP_ID,
  });

  await ensureSchema();
  consumer = await startConsumer(
    async ({ message }) => {
      if (!message.value) return;
      try {
        metrics.record(parseEvent(message.value.toString(), serviceFallback));
      } catch (error) {
        console.warn("[worker] discarded invalid event", {
          reason: error.message,
        });
      }
    },
    (error) => {
      console.error("[worker] Kafka consumer failed", error);
      shutdown("consumer failure", 1);
    }
  );
  scheduleFlush();
  console.log("[worker] ready");
}

main().catch((error) => {
  console.error("[worker] startup failed", error);
  shutdown("startup failure", 1);
});
