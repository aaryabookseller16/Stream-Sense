import { randomUUID } from "node:crypto";
import { Kafka, Partitioners, logLevel } from "kafkajs";

const brokers = (process.env.KAFKA_BROKERS || "kafka:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);
const topic = process.env.KAFKA_TOPIC || "events";
const intervalMs = Math.max(100, Number(process.env.EVENT_INTERVAL_MS || 350));

const services = [
  { name: "checkout", weight: 30, latency: 210, errorRate: 0.035 },
  { name: "catalog", weight: 28, latency: 95, errorRate: 0.012 },
  { name: "payments", weight: 18, latency: 360, errorRate: 0.055 },
  { name: "identity", weight: 14, latency: 145, errorRate: 0.018 },
  { name: "notifications", weight: 10, latency: 80, errorRate: 0.008 },
];

const totalWeight = services.reduce((sum, service) => sum + service.weight, 0);

// Local Redpanda needs neither SSL nor SASL; Upstash Kafka (and most hosted
// brokers) require SASL_SSL, set via these env vars in production.
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
  clientId: "streamsense-simulator",
  brokers,
  logLevel: logLevel.INFO,
  ssl,
  sasl,
  retry: { initialRetryTime: 500, retries: 12 },
});
const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
});

let timer;
let sent = 0;
let shuttingDown = false;

function selectService() {
  let position = Math.random() * totalWeight;
  for (const service of services) {
    position -= service.weight;
    if (position <= 0) return service;
  }
  return services.at(-1);
}

function createEvent() {
  const service = selectService();
  const isSpike = Math.random() < 0.025;
  const spread = service.latency * 0.45;
  const latency = Math.max(
    12,
    Math.round(
      service.latency +
        (Math.random() + Math.random() - 1) * spread +
        (isSpike ? service.latency * (2 + Math.random() * 2) : 0)
    )
  );
  const isError = Math.random() < service.errorRate + (isSpike ? 0.08 : 0);

  return {
    id: randomUUID(),
    service: service.name,
    type: "request.completed",
    status: isError ? "error" : "ok",
    status_code: isError ? (Math.random() < 0.7 ? 500 : 429) : 200,
    latency_ms: latency,
    ts: new Date().toISOString(),
  };
}

async function waitForTopic() {
  const admin = kafka.admin();
  await admin.connect();
  try {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const topics = await admin.listTopics();
      if (topics.includes(topic)) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Kafka topic "${topic}" was not ready within 15 seconds`);
  } finally {
    await admin.disconnect();
  }
}

async function publish() {
  const event = createEvent();
  await producer.send({
    topic,
    messages: [
      {
        key: event.service,
        value: JSON.stringify(event),
      },
    ],
  });
  sent += 1;
  if (sent % 100 === 0) {
    console.log(`[simulator] published ${sent} events`);
  }
}

function schedule() {
  timer = setTimeout(async () => {
    try {
      await publish();
    } catch (error) {
      console.error("[simulator] publish failed", error);
    } finally {
      if (!shuttingDown) schedule();
    }
  }, intervalMs);
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(timer);
  console.log(`[simulator] received ${signal}; shutting down`);
  await producer.disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

async function main() {
  console.log("[simulator] starting", { brokers, topic, intervalMs });
  await waitForTopic();
  await producer.connect();
  schedule();
  console.log("[simulator] ready");
}

main().catch((error) => {
  console.error("[simulator] startup failed", error);
  process.exit(1);
});
