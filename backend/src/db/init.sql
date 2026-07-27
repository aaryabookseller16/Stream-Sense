CREATE TABLE IF NOT EXISTS service_kpis (
    minute_bucket TIMESTAMPTZ NOT NULL,
    service TEXT NOT NULL,
    event_count INTEGER NOT NULL CHECK (event_count >= 0),
    error_count INTEGER NOT NULL CHECK (error_count >= 0),
    avg_latency_ms DOUBLE PRECISION NOT NULL CHECK (avg_latency_ms >= 0),
    p95_latency_ms DOUBLE PRECISION NOT NULL CHECK (p95_latency_ms >= 0),
    last_event_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (minute_bucket, service)
);

CREATE INDEX IF NOT EXISTS idx_service_kpis_updated_at
    ON service_kpis (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_kpis_service_bucket
    ON service_kpis (service, minute_bucket DESC);
