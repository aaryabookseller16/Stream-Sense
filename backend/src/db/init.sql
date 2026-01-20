

-- StreamSense Reactor
-- Initial database schema for backend KPIs
--
-- This schema is intentionally minimal.
-- The worker service is responsible for continuously updating these tables
-- based on streaming events consumed from Kafka / Redpanda.

-- ---------------------------------------------------------------------------
-- Table: kpis
-- Stores the latest value of each computed metric.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpis (
    id SERIAL PRIMARY KEY,

    -- Name of the metric (e.g. "events_per_second", "avg_latency")
    metric_name TEXT NOT NULL,

    -- Numeric value of the metric
    metric_value DOUBLE PRECISION NOT NULL,

    -- When this metric was last updated by the worker
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Fast lookups by metric name
CREATE INDEX IF NOT EXISTS idx_kpis_metric_name
    ON kpis (metric_name);

-- Sort by most recent updates
CREATE INDEX IF NOT EXISTS idx_kpis_updated_at
    ON kpis (updated_at DESC);