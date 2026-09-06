const SERVICES = [
  { service: "checkout", traffic: 34, latency: 214, errorRate: 0.024, phase: 0.4 },
  { service: "catalog", traffic: 29, latency: 96, errorRate: 0.011, phase: 1.3 },
  { service: "payments", traffic: 20, latency: 382, errorRate: 0.061, phase: 2.1 },
  { service: "identity", traffic: 15, latency: 148, errorRate: 0.017, phase: 2.8 },
  { service: "notifications", traffic: 11, latency: 82, errorRate: 0.008, phase: 3.6 },
];

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function minuteSeed(date) {
  return Math.floor(date.getTime() / 60_000);
}

function serviceStatus(errorRate, averageLatency) {
  return errorRate >= 5 || averageLatency >= 800 ? "degraded" : "healthy";
}

/**
 * Builds deterministic sample telemetry for the static Vercel showcase.
 * The same minute always produces the same values, which keeps screenshots,
 * tests, and recruiter review reproducible while still demonstrating every
 * dashboard interaction.
 */
export function createDemoMetrics(windowMinutes, now = new Date()) {
  const end = new Date(now);
  end.setUTCSeconds(0, 0);

  const serviceTotals = new Map(
    SERVICES.map((service) => [
      service.service,
      { eventCount: 0, errorCount: 0, latencySum: 0, p95: 0 },
    ])
  );

  const timeline = Array.from({ length: windowMinutes }, (_, index) => {
    const minute = new Date(end.getTime() - (windowMinutes - 1 - index) * 60_000);
    const seed = minuteSeed(minute);
    let eventCount = 0;
    let errorCount = 0;
    let latencySum = 0;
    let highestP95 = 0;

    SERVICES.forEach((service, serviceIndex) => {
      const wave = Math.sin(seed * 0.23 + service.phase) * 0.16;
      const pulse = Math.cos(seed * 0.071 + service.phase) * 0.09;
      const count = Math.max(1, Math.round(service.traffic * (1 + wave + pulse)));
      const incident = service.service === "payments" && seed % 17 > 11;
      const averageLatency = Math.round(
        service.latency * (1 + Math.sin(seed * 0.17 + serviceIndex) * 0.12) +
          (incident ? 140 : 0)
      );
      const rate = service.errorRate + (incident ? 0.026 : 0);
      const errors = Math.max(0, Math.round(count * rate));
      const p95 = Math.round(averageLatency * (1.65 + serviceIndex * 0.04));
      const totals = serviceTotals.get(service.service);

      totals.eventCount += count;
      totals.errorCount += errors;
      totals.latencySum += averageLatency * count;
      totals.p95 = Math.max(totals.p95, p95);
      eventCount += count;
      errorCount += errors;
      latencySum += averageLatency * count;
      highestP95 = Math.max(highestP95, p95);
    });

    return {
      minute_bucket: minute.toISOString(),
      event_count: eventCount,
      error_count: errorCount,
      avg_latency_ms: round(latencySum / eventCount),
      p95_latency_ms: highestP95,
    };
  });

  const services = SERVICES.map((service) => {
    const totals = serviceTotals.get(service.service);
    const errorRate = (totals.errorCount / totals.eventCount) * 100;
    const averageLatency = totals.latencySum / totals.eventCount;

    return {
      service: service.service,
      event_count: totals.eventCount,
      error_count: totals.errorCount,
      error_rate: round(errorRate, 2),
      avg_latency_ms: round(averageLatency),
      p95_latency_ms: totals.p95,
      last_seen: now.toISOString(),
      status: serviceStatus(errorRate, averageLatency),
    };
  }).sort((a, b) => b.event_count - a.event_count);

  const totalEvents = services.reduce((sum, service) => sum + service.event_count, 0);
  const totalErrors = services.reduce((sum, service) => sum + service.error_count, 0);
  const weightedLatency = services.reduce(
    (sum, service) => sum + service.avg_latency_ms * service.event_count,
    0
  );

  return {
    generated_at: now.toISOString(),
    window_minutes: windowMinutes,
    mode: "showcase",
    summary: {
      total_events: totalEvents,
      events_per_minute: round(totalEvents / windowMinutes),
      error_rate: round((totalErrors / totalEvents) * 100, 2),
      avg_latency_ms: round(weightedLatency / totalEvents),
      p95_latency_ms: Math.max(...services.map((service) => service.p95_latency_ms)),
      active_services: services.length,
    },
    timeline,
    services,
  };
}

