

/**
 * Kafka helper (Worker)
 *
 * Goal:
 * - Keep Kafka setup in one place so index.js stays readable.
 *
 * Env vars (set in docker-compose.yml):
 * - KAFKA_BROKERS  e.g. "kafka:9092" or "kafka:9092,other:9092"
 * - KAFKA_GROUP_ID e.g. "streamsense-worker"
 * - KAFKA_TOPIC    e.g. "events"
 */

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
      try {
        await handler(payload);
      } catch (err) {
        // We don't want one bad message to crash the worker.
        console.error("[worker] handler error:", err);
      }
    },
  });

  return consumer;
}