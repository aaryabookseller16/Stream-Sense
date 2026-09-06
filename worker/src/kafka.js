import { Kafka, logLevel } from "kafkajs";

function readEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export const KAFKA_BROKERS = readEnv("KAFKA_BROKERS", "kafka:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);
export const KAFKA_GROUP_ID = readEnv(
  "KAFKA_GROUP_ID",
  "streamsense-worker-v1"
);
export const KAFKA_TOPIC = readEnv("KAFKA_TOPIC", "events");

// Local Redpanda needs neither SSL nor SASL, so both stay off unless
// explicitly turned on — Upstash Kafka (and most hosted brokers) require
// SASL_SSL, set via these env vars in production.
const ssl = process.env.KAFKA_SSL === "true";
const sasl =
  process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
    ? {
        mechanism: process.env.KAFKA_SASL_MECHANISM || "scram-sha-256",
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
      }
    : undefined;

const kafka = new Kafka({
  clientId: "streamsense-worker",
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.INFO,
  ssl,
  sasl,
  retry: {
    initialRetryTime: 500,
    retries: 12,
  },
});

async function ensureTopic() {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const topics = await admin.listTopics();
    if (topics.includes(KAFKA_TOPIC)) return;

    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: KAFKA_TOPIC,
          numPartitions: Number(process.env.KAFKA_PARTITIONS || 3),
          replicationFactor: 1,
        },
      ],
    });
  } catch (error) {
    // Managed brokers (e.g. Upstash) often don't grant topic-creation
    // permission to app credentials — assume the topic already exists
    // (created manually in the provider's console) rather than crash.
    console.warn(
      "[worker] could not verify/create Kafka topic, assuming it already exists",
      { reason: error.message }
    );
  } finally {
    await admin.disconnect();
  }
}

export async function startConsumer(handler, onFatal) {
  await ensureTopic();
  const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });

  consumer
    .run({
      partitionsConsumedConcurrently: 3,
      eachMessage: handler,
    })
    .catch(onFatal);

  return consumer;
}
