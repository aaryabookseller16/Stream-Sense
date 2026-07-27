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

const kafka = new Kafka({
  clientId: "streamsense-worker",
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.INFO,
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
