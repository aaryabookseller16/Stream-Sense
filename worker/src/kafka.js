import { Kafka } from "kafkajs";

function requireEnv(name, fallback = undefined) {
  const val = process.env[name] ?? fallback;
  if (!val) {
    throw new Error(`Missing ${name} env var`);
  }
  return val;
}

export const KAFKA_BROKERS = requireEnv("KAFKA_BROKERS", "kafka:9092")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const KAFKA_GROUP_ID = requireEnv("KAFKA_GROUP_ID", "streamsense-worker");
export const KAFKA_TOPIC = requireEnv("KAFKA_TOPIC", "events");

export const kafka = new Kafka({
  clientId: "streamsense-worker",
  brokers: KAFKA_BROKERS,
});

/**
 * Create and connect a Kafka consumer.
 * Consumer will join the group and receive partitions for the topic.
 */
export async function createConsumer() {
  const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
  await consumer.connect();
  return consumer;
}

/**
 * Convenience helper:
 * - connects a consumer
 * - subscribes to the topic
 * - starts consuming with your message handler
 *
 * handler signature:
 *   async ({ topic, partition, message }) => void
 */
export async function startConsumer(handler) {
  const consumer = await createConsumer();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });

  await consumer.run({
    eachMessage: async (payload) => {
      const raw = payload?.message?.value?.toString?.() ?? "";

      // Lightweight visibility: confirm we are actually consuming messages.
      // (Kept simple on purpose — this is your main debugging signal.)
      console.log("[worker] consumed event:", raw);

      // Best-effort JSON parse so your handler can work with either a string or object.
      let json = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore parse errors; handler can still use `raw`
      }

      try {
        await handler({ ...payload, raw, json });
      } catch (err) {
        // We don't want one bad message to crash the worker.
        console.error("[worker] handler error:", err);
      }
    },
  });

  return consumer;
}