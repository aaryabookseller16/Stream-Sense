import assert from "node:assert/strict";
import test from "node:test";
import { MetricsStore, parseEvent, percentile95 } from "../src/metrics.js";

test("parseEvent normalizes service, status, latency, and timestamp", () => {
  const event = parseEvent(
    JSON.stringify({
      service: "Checkout API",
      status_code: 503,
      latency_ms: 482,
      ts: "2026-01-20T12:00:32.000Z",
    })
  );

  assert.equal(event.service, "checkout-api");
  assert.equal(event.is_error, true);
  assert.equal(event.latency_ms, 482);
  assert.equal(event.timestamp.toISOString(), "2026-01-20T12:00:32.000Z");
});

test("parseEvent rejects malformed latency", () => {
  assert.throws(
    () => parseEvent({ service: "api", latency_ms: "fast" }),
    /latency_ms/
  );
});

test("percentile95 uses nearest-rank behavior", () => {
  assert.equal(percentile95([10, 20, 30, 40, 50]), 50);
  assert.equal(percentile95([]), 0);
});

test("MetricsStore creates per-minute, per-service snapshots", () => {
  const store = new MetricsStore();
  const timestamp = new Date("2026-01-20T12:00:30.000Z");

  store.record({
    service: "checkout",
    latency_ms: 100,
    is_error: false,
    timestamp,
  });
  store.record({
    service: "checkout",
    latency_ms: 300,
    is_error: true,
    timestamp,
  });
  store.record({
    service: "catalog",
    latency_ms: 80,
    is_error: false,
    timestamp,
  });

  const snapshots = store.snapshots();
  const checkout = snapshots.find((row) => row.service === "checkout");

  assert.equal(snapshots.length, 2);
  assert.equal(checkout.minute_bucket, "2026-01-20T12:00:00.000Z");
  assert.equal(checkout.event_count, 2);
  assert.equal(checkout.error_count, 1);
  assert.equal(checkout.avg_latency_ms, 200);
  assert.equal(checkout.p95_latency_ms, 300);
  assert.equal(checkout.last_event_at, "2026-01-20T12:00:30.000Z");

  const dirty = store.snapshots({ dirtyOnly: true });
  assert.equal(dirty.length, 2);
  store.markPersisted(dirty);
  assert.equal(store.snapshots({ dirtyOnly: true }).length, 0);
});

test("MetricsStore prunes buckets older than the retention window", () => {
  const store = new MetricsStore({ retentionMinutes: 5 });
  const old = new Date("2026-01-20T12:00:00.000Z");
  const recent = new Date("2026-01-20T12:10:00.000Z");

  store.record({ service: "checkout", latency_ms: 100, is_error: false, timestamp: old });
  // Recording a later event triggers prune() against `recent`, which is well
  // past the 5-minute retention window for the "old" bucket.
  store.record({ service: "checkout", latency_ms: 90, is_error: false, timestamp: recent });

  const buckets = store.snapshots();
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].minute_bucket, "2026-01-20T12:10:00.000Z");
});
