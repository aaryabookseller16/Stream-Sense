const MAX_LATENCY_MS = 120_000;
const RETENTION_MINUTES = 120;
const MAX_LATENCY_SAMPLES = 512;

function percentile95(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

export class LatencyReservoir {
  constructor(limit = MAX_LATENCY_SAMPLES, random = Math.random) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new TypeError("Latency sample limit must be a positive integer");
    }
    this.limit = limit;
    this.random = random;
    this.samples = [];
    this.seen = 0;
  }

  record(value) {
    this.seen += 1;
    if (this.samples.length < this.limit) {
      this.samples.push(value);
      return;
    }

    const replacementIndex = Math.floor(this.random() * this.seen);
    if (replacementIndex < this.limit) {
      this.samples[replacementIndex] = value;
    }
  }

  percentile95() {
    return percentile95(this.samples);
  }
}

function normalizeService(value, fallback) {
  const service = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return service || fallback;
}

export function parseEvent(messageValue, fallbackService = "unknown-service") {
  const input =
    typeof messageValue === "string" ? JSON.parse(messageValue) : messageValue;

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Event must be a JSON object");
  }

  const latencyMs = Number(input.latency_ms);
  if (!Number.isFinite(latencyMs) || latencyMs < 0 || latencyMs > MAX_LATENCY_MS) {
    throw new TypeError("latency_ms must be between 0 and 120000");
  }

  const timestamp = input.ts ? new Date(input.ts) : new Date();
  if (Number.isNaN(timestamp.getTime())) {
    throw new TypeError("ts must be a valid timestamp");
  }

  const statusCode = Number(input.status_code);
  const isError =
    input.status === "error" ||
    input.status === "failed" ||
    (Number.isFinite(statusCode) && statusCode >= 400);

  return {
    service: normalizeService(input.service, fallbackService),
    latency_ms: latencyMs,
    is_error: isError,
    timestamp,
  };
}

export class MetricsStore {
  constructor({
    retentionMinutes = RETENTION_MINUTES,
    maxLatencySamples = MAX_LATENCY_SAMPLES,
    random = Math.random,
  } = {}) {
    this.buckets = new Map();
    this.dirtyKeys = new Set();
    this.retentionMinutes = retentionMinutes;
    this.maxLatencySamples = maxLatencySamples;
    this.random = random;
  }

  record(event) {
    const minute = new Date(event.timestamp);
    minute.setUTCSeconds(0, 0);
    const key = `${minute.toISOString()}::${event.service}`;
    const bucket = this.buckets.get(key) || {
      minute_bucket: minute.toISOString(),
      service: event.service,
      event_count: 0,
      error_count: 0,
      latency_sum: 0,
      latencies: new LatencyReservoir(this.maxLatencySamples, this.random),
      last_event_at: event.timestamp.toISOString(),
      version: 0,
    };

    bucket.event_count += 1;
    bucket.error_count += event.is_error ? 1 : 0;
    bucket.latency_sum += event.latency_ms;
    bucket.latencies.record(event.latency_ms);
    if (event.timestamp > new Date(bucket.last_event_at)) {
      bucket.last_event_at = event.timestamp.toISOString();
    }
    bucket.version += 1;
    this.buckets.set(key, bucket);
    this.dirtyKeys.add(key);
    this.prune(event.timestamp);
  }

  prune(now = new Date()) {
    const cutoff = now.getTime() - this.retentionMinutes * 60_000;
    for (const [key, bucket] of this.buckets) {
      if (new Date(bucket.minute_bucket).getTime() < cutoff) {
        this.buckets.delete(key);
        this.dirtyKeys.delete(key);
      }
    }
  }

  snapshots({ dirtyOnly = false } = {}) {
    const buckets = dirtyOnly
      ? [...this.dirtyKeys]
          .map((key) => this.buckets.get(key))
          .filter(Boolean)
      : [...this.buckets.values()];

    return buckets.map((bucket) => ({
      minute_bucket: bucket.minute_bucket,
      service: bucket.service,
      event_count: bucket.event_count,
      error_count: bucket.error_count,
      avg_latency_ms: Number(
        (bucket.latency_sum / bucket.event_count).toFixed(2)
      ),
      p95_latency_ms: Number(bucket.latencies.percentile95().toFixed(2)),
      last_event_at: bucket.last_event_at,
      _key: `${bucket.minute_bucket}::${bucket.service}`,
      _version: bucket.version,
    }));
  }

  markPersisted(snapshots) {
    for (const snapshot of snapshots) {
      const current = this.buckets.get(snapshot._key);
      if (current?.version === snapshot._version) {
        this.dirtyKeys.delete(snapshot._key);
      }
    }
  }
}

export { percentile95 };
