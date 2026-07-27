import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { buildMetricsPayload, createApp, parseWindowMinutes } from "../src/app.js";

const servers = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise((resolve) => server.close(resolve))
    )
  );
});

async function startApp(pool) {
  const logger = { error() {} };
  const server = createApp({ pool, logger }).listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test("window parsing clamps untrusted input", () => {
  assert.equal(parseWindowMinutes(undefined), 15);
  assert.equal(parseWindowMinutes("1"), 5);
  assert.equal(parseWindowMinutes("30"), 30);
  assert.equal(parseWindowMinutes("999"), 120);
  assert.equal(parseWindowMinutes("nope"), 15);
});

test("metrics payload aggregates service and timeline values", () => {
  const now = new Date("2026-01-20T12:02:30.000Z");
  const rows = [
    {
      minute_bucket: "2026-01-20T12:02:00.000Z",
      service: "checkout",
      event_count: 8,
      error_count: 1,
      avg_latency_ms: 100,
      p95_latency_ms: 180,
      last_event_at: "2026-01-20T12:02:24.000Z",
      updated_at: "2026-01-20T12:02:25.000Z",
    },
    {
      minute_bucket: "2026-01-20T12:02:00.000Z",
      service: "catalog",
      event_count: 2,
      error_count: 0,
      avg_latency_ms: 50,
      p95_latency_ms: 70,
      last_event_at: "2026-01-20T12:02:19.000Z",
      updated_at: "2026-01-20T12:02:20.000Z",
    },
  ];

  const payload = buildMetricsPayload(rows, 5, now);

  assert.equal(payload.summary.total_events, 10);
  assert.equal(payload.summary.error_rate, 10);
  assert.equal(payload.summary.avg_latency_ms, 90);
  assert.equal(payload.summary.events_per_minute, 10);
  assert.equal(payload.summary.active_services, 2);
  assert.equal(payload.timeline.at(-1).event_count, 10);
  assert.equal(payload.services[0].service, "checkout");
});

test("health and KPI endpoints return stable contracts", async () => {
  const pool = {
    async query(sql) {
      if (sql === "SELECT 1") return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    },
  };
  const baseUrl = await startApp(pool);

  const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
  const metrics = await fetch(`${baseUrl}/kpis?minutes=5`).then((response) =>
    response.json()
  );

  assert.equal(health.status, "ok");
  assert.equal(metrics.window_minutes, 5);
  assert.equal(metrics.timeline.length, 5);
  assert.deepEqual(metrics.services, []);
});

test("database failures return a non-success response", async () => {
  const pool = {
    async query() {
      throw new Error("database unavailable");
    },
  };
  const baseUrl = await startApp(pool);
  const response = await fetch(`${baseUrl}/kpis`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error, "metrics_unavailable");
});
