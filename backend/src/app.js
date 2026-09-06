import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const DEFAULT_WINDOW_MINUTES = 15;
const MIN_WINDOW_MINUTES = 5;
const MAX_WINDOW_MINUTES = 120;

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function metricStatus({ lastSeen, errorRate, avgLatencyMs }, now) {
  const ageMs = now.getTime() - lastSeen.getTime();
  if (ageMs > 120_000) return "offline";
  if (errorRate >= 5 || avgLatencyMs >= 800) return "degraded";
  return "healthy";
}

export function parseWindowMinutes(value) {
  if (value === undefined) return DEFAULT_WINDOW_MINUTES;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_WINDOW_MINUTES;
  return Math.min(MAX_WINDOW_MINUTES, Math.max(MIN_WINDOW_MINUTES, parsed));
}

export function buildMetricsPayload(rows, windowMinutes, now = new Date()) {
  const timelineByMinute = new Map();
  const servicesByName = new Map();

  for (const row of rows) {
    const eventCount = asNumber(row.event_count);
    const errorCount = asNumber(row.error_count);
    const avgLatencyMs = asNumber(row.avg_latency_ms);
    const p95LatencyMs = asNumber(row.p95_latency_ms);
    const minute = new Date(row.minute_bucket).toISOString();
    const lastEventAt = new Date(row.last_event_at || row.updated_at);

    const timeline = timelineByMinute.get(minute) || {
      minute_bucket: minute,
      event_count: 0,
      error_count: 0,
      latency_weighted_sum: 0,
      p95_latency_ms: 0,
    };
    timeline.event_count += eventCount;
    timeline.error_count += errorCount;
    timeline.latency_weighted_sum += avgLatencyMs * eventCount;
    timeline.p95_latency_ms = Math.max(timeline.p95_latency_ms, p95LatencyMs);
    timelineByMinute.set(minute, timeline);

    const service = servicesByName.get(row.service) || {
      service: row.service,
      event_count: 0,
      error_count: 0,
      latency_weighted_sum: 0,
      p95_latency_ms: 0,
      last_seen: lastEventAt,
    };
    service.event_count += eventCount;
    service.error_count += errorCount;
    service.latency_weighted_sum += avgLatencyMs * eventCount;
    service.p95_latency_ms = Math.max(service.p95_latency_ms, p95LatencyMs);
    if (lastEventAt > service.last_seen) service.last_seen = lastEventAt;
    servicesByName.set(row.service, service);
  }

  const start = new Date(now);
  start.setUTCSeconds(0, 0);
  start.setUTCMinutes(start.getUTCMinutes() - (windowMinutes - 1));

  const timeline = Array.from({ length: windowMinutes }, (_, index) => {
    const minuteDate = new Date(start.getTime() + index * 60_000);
    const key = minuteDate.toISOString();
    const metric = timelineByMinute.get(key);
    if (!metric) {
      return {
        minute_bucket: key,
        event_count: 0,
        error_count: 0,
        avg_latency_ms: 0,
        p95_latency_ms: 0,
      };
    }

    return {
      minute_bucket: key,
      event_count: metric.event_count,
      error_count: metric.error_count,
      avg_latency_ms: round(
        metric.event_count ? metric.latency_weighted_sum / metric.event_count : 0
      ),
      p95_latency_ms: round(metric.p95_latency_ms),
    };
  });

  const services = [...servicesByName.values()]
    .map((service) => {
      const errorRate = service.event_count
        ? (service.error_count / service.event_count) * 100
        : 0;
      const avgLatencyMs = service.event_count
        ? service.latency_weighted_sum / service.event_count
        : 0;

      return {
        service: service.service,
        event_count: service.event_count,
        error_count: service.error_count,
        error_rate: round(errorRate, 2),
        avg_latency_ms: round(avgLatencyMs),
        p95_latency_ms: round(service.p95_latency_ms),
        last_seen: service.last_seen.toISOString(),
        status: metricStatus(
          { lastSeen: service.last_seen, errorRate, avgLatencyMs },
          now
        ),
      };
    })
    .sort((a, b) => b.event_count - a.event_count);

  const totalEvents = services.reduce((sum, service) => sum + service.event_count, 0);
  const totalErrors = services.reduce((sum, service) => sum + service.error_count, 0);
  const firstActiveMinute = timeline.findIndex((point) => point.event_count > 0);
  const observedMinutes =
    firstActiveMinute === -1 ? windowMinutes : timeline.length - firstActiveMinute;
  const latencyWeightedSum = services.reduce(
    (sum, service) => sum + service.avg_latency_ms * service.event_count,
    0
  );

  return {
    generated_at: now.toISOString(),
    window_minutes: windowMinutes,
    summary: {
      total_events: totalEvents,
      events_per_minute: round(totalEvents / Math.max(1, observedMinutes)),
      error_rate: round(totalEvents ? (totalErrors / totalEvents) * 100 : 0, 2),
      avg_latency_ms: round(totalEvents ? latencyWeightedSum / totalEvents : 0),
      p95_latency_ms: round(
        services.reduce(
          (highest, service) => Math.max(highest, service.p95_latency_ms),
          0
        )
      ),
      active_services: services.filter((service) => service.status !== "offline").length,
    },
    timeline,
    services,
  };
}

// Comma-separated list of allowed browser origins. Empty by default (deny all
// cross-origin requests) so a missing env var fails closed rather than open.
function corsAllowedOrigins() {
  return (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const metricsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp({ pool, logger = console }) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: corsAllowedOrigins() }));
  app.use(metricsLimiter);
  app.use(express.json({ limit: "32kb" }));
  app.use((request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });

  app.get("/health", async (_request, response) => {
    try {
      await pool.query("SELECT 1");
      response.json({
        status: "ok",
        service: "streamsense-backend",
        database: "connected",
        uptime_seconds: Math.round(process.uptime()),
      });
    } catch (error) {
      logger.error("[backend] health check failed", error);
      response.status(503).json({
        status: "error",
        service: "streamsense-backend",
        database: "unavailable",
      });
    }
  });

  app.get("/kpis", async (request, response) => {
    const windowMinutes = parseWindowMinutes(request.query.minutes);

    try {
      const result = await pool.query(
        `
          SELECT
            minute_bucket,
            service,
            event_count,
            error_count,
            avg_latency_ms,
            p95_latency_ms,
            last_event_at,
            updated_at
          FROM service_kpis
          WHERE minute_bucket >=
            date_trunc('minute', NOW()) - (($1::int - 1) * INTERVAL '1 minute')
          ORDER BY minute_bucket ASC, service ASC
        `,
        [windowMinutes]
      );

      response.json(buildMetricsPayload(result.rows, windowMinutes));
    } catch (error) {
      logger.error("[backend] KPI query failed", error);
      response.status(503).json({
        error: "metrics_unavailable",
        message: "Metrics are temporarily unavailable.",
      });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: "not_found",
      message: "The requested endpoint does not exist.",
    });
  });

  return app;
}
