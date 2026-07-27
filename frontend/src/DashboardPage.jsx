import { useEffect, useMemo, useState } from "react";
import "./App.css";

const REFRESH_INTERVAL_MS = 4_000;
const WINDOW_OPTIONS = [15, 30, 60];

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatTime(value) {
  if (!value) return "Waiting for data";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatMinute(value) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({ eyebrow, value, unit, detail, tone = "neutral" }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <p className="metric-card__eyebrow">{eyebrow}</p>
      <div className="metric-card__value-row">
        <strong>{value}</strong>
        {unit && <span>{unit}</span>}
      </div>
      <p className="metric-card__detail">{detail}</p>
    </article>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      <span aria-hidden="true" />
      {status}
    </span>
  );
}

function ThroughputChart({ timeline }) {
  const maxEvents = Math.max(1, ...timeline.map((point) => point.event_count));
  const labelStep = Math.max(1, Math.floor(timeline.length / 5));

  return (
    <div className="chart" aria-label="Request throughput by minute">
      <div className="chart__grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="chart__bars">
        {timeline.map((point, index) => {
          const barHeight = (point.event_count / maxEvents) * 100;
          const errorHeight = point.event_count
            ? (point.error_count / point.event_count) * 100
            : 0;
          return (
            <div
              className="chart__column"
              key={point.minute_bucket}
              title={`${formatMinute(point.minute_bucket)} · ${point.event_count} requests · ${point.error_count} errors`}
            >
              <div className="chart__track">
                <div
                  className="chart__bar"
                  style={{ height: `${Math.max(barHeight, point.event_count ? 4 : 0)}%` }}
                >
                  <span
                    className="chart__errors"
                    style={{ height: `${errorHeight}%` }}
                  />
                </div>
              </div>
              <span className="chart__label">
                {index % labelStep === 0 || index === timeline.length - 1
                  ? formatMinute(point.minute_bucket)
                  : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceList({ services }) {
  if (services.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state__pulse" aria-hidden="true" />
        <strong>Listening for events</strong>
        <p>The simulator is warming up. Service telemetry will appear here shortly.</p>
      </div>
    );
  }

  return (
    <div className="service-list">
      {services.map((service) => (
        <article className="service-row" key={service.service}>
          <div className="service-row__heading">
            <div>
              <strong>{service.service}</strong>
              <span>{formatNumber(service.event_count)} requests</span>
            </div>
            <StatusPill status={service.status} />
          </div>
          <div className="service-row__metrics">
            <span>
              <small>Avg latency</small>
              <strong>{formatNumber(service.avg_latency_ms)} ms</strong>
            </span>
            <span>
              <small>Error rate</small>
              <strong>{service.error_rate.toFixed(2)}%</strong>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function RecentMinutes({ timeline }) {
  const populated = timeline
    .filter((point) => point.event_count > 0)
    .slice(-6)
    .reverse();

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Minute</th>
            <th>Requests</th>
            <th>Errors</th>
            <th>Avg latency</th>
            <th>P95 latency</th>
          </tr>
        </thead>
        <tbody>
          {populated.length === 0 ? (
            <tr>
              <td className="table-empty" colSpan="5">
                No completed metric windows yet.
              </td>
            </tr>
          ) : (
            populated.map((point) => (
              <tr key={point.minute_bucket}>
                <td>
                  <time dateTime={point.minute_bucket}>
                    {formatMinute(point.minute_bucket)}
                  </time>
                </td>
                <td>{formatNumber(point.event_count)}</td>
                <td className={point.error_count ? "text-warn" : ""}>
                  {formatNumber(point.error_count)}
                </td>
                <td>{formatNumber(point.avg_latency_ms)} ms</td>
                <td>{formatNumber(point.p95_latency_ms)} ms</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DashboardPage({ onNavigate }) {
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function fetchMetrics(background = false) {
      if (background) setRefreshing(true);
      try {
        const response = await fetch(`/api/kpis?minutes=${windowMinutes}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Metrics request failed with ${response.status}`);
        }
        const payload = await response.json();
        if (!active) return;
        setMetrics(payload);
        setError(null);
      } catch (requestError) {
        if (requestError.name !== "AbortError" && active) {
          setError("Telemetry is temporarily unavailable. Retrying automatically.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    setLoading(true);
    fetchMetrics();
    const interval = window.setInterval(
      () => fetchMetrics(true),
      REFRESH_INTERVAL_MS
    );

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [windowMinutes]);

  const summary = metrics?.summary;
  const systemStatus = useMemo(() => {
    if (error) return "interrupted";
    if (!summary || summary.active_services === 0) return "warming";
    if (metrics.services.some((service) => service.status === "degraded")) {
      return "attention";
    }
    return "operational";
  }, [error, metrics, summary]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="StreamSense product overview"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/");
          }}
        >
          <span className="brand__mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>StreamSense</strong>
            <small>Realtime service intelligence</small>
          </span>
        </a>

        <div className="topbar__actions">
          <a
            className="topbar__back"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/");
            }}
          >
            <span aria-hidden="true">←</span>
            Product overview
          </a>
          <div className="topbar__status" aria-live="polite">
            <span className={`live-dot live-dot--${systemStatus}`} aria-hidden="true" />
            <span>
              <small>System status</small>
              <strong>{systemStatus}</strong>
            </span>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h1>Know what your services are doing—right now.</h1>
            <p className="hero__copy">
              Live traffic, latency, and failure signals across every active service.
            </p>
          </div>
          <div className="hero__controls">
            <div className="window-picker" aria-label="Metrics time window">
              {WINDOW_OPTIONS.map((option) => (
                <button
                  className={windowMinutes === option ? "is-active" : ""}
                  key={option}
                  onClick={() => setWindowMinutes(option)}
                  type="button"
                >
                  {option}m
                </button>
              ))}
            </div>
            <p className={refreshing ? "is-refreshing" : ""}>
              <span aria-hidden="true">↻</span>
              Updated {formatTime(metrics?.generated_at)}
            </p>
          </div>
        </section>

        {error && (
          <div className="alert" role="status">
            <strong>Connection interrupted</strong>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <section className="loading-grid" aria-label="Loading telemetry">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} />
            ))}
          </section>
        ) : (
          <>
            <section className="metric-grid" aria-label="Key performance indicators">
              <MetricCard
                detail={`Across the last ${windowMinutes} minutes`}
                eyebrow="Total requests"
                tone="accent"
                value={formatNumber(summary?.total_events)}
              />
              <MetricCard
                detail={`${formatNumber(summary?.events_per_minute)} requests per minute`}
                eyebrow="Traffic rate"
                unit="/ min"
                value={formatNumber(summary?.events_per_minute)}
              />
              <MetricCard
                detail={`P95 is ${formatNumber(summary?.p95_latency_ms)} ms`}
                eyebrow="Average latency"
                tone={summary?.avg_latency_ms >= 800 ? "warning" : "neutral"}
                unit="ms"
                value={formatNumber(summary?.avg_latency_ms)}
              />
              <MetricCard
                detail={`${summary?.active_services || 0} active services`}
                eyebrow="Error rate"
                tone={summary?.error_rate >= 5 ? "danger" : "positive"}
                unit="%"
                value={(summary?.error_rate || 0).toFixed(2)}
              />
            </section>

            <section className="dashboard-grid">
              <article className="panel panel--chart">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Traffic signal</p>
                    <h2>Request throughput</h2>
                  </div>
                  <div className="legend">
                    <span><i className="legend__traffic" />Requests</span>
                    <span><i className="legend__errors" />Errors</span>
                  </div>
                </div>
                <ThroughputChart timeline={metrics?.timeline || []} />
              </article>

              <aside className="panel panel--services">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Service health</p>
                    <h2>Active services</h2>
                  </div>
                  <span className="service-count">{metrics?.services.length || 0}</span>
                </div>
                <ServiceList services={metrics?.services || []} />
              </aside>
            </section>

            <section className="panel panel--table">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Window detail</p>
                  <h2>Recent minute buckets</h2>
                </div>
                <p className="panel__note">UTC-normalized · auto-refreshes every 4s</p>
              </div>
              <RecentMinutes timeline={metrics?.timeline || []} />
            </section>
          </>
        )}
      </main>

      <footer>
        <span>StreamSense Reactor</span>
        <span>Kafka → Worker → PostgreSQL → API</span>
      </footer>
    </div>
  );
}

export default DashboardPage;
