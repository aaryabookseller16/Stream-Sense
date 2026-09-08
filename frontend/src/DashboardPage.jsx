import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { MetricCard } from "./components/MetricCard.jsx";
import { ThroughputChart } from "./components/ThroughputChart.jsx";
import { ServiceList } from "./components/ServiceList.jsx";
import { RecentMinutes } from "./components/RecentMinutes.jsx";
import { formatNumber, formatTime } from "./components/formatters.js";
import { SiteHeader } from "./components/SiteHeader.jsx";
import { createDemoMetrics } from "./demoMetrics.js";

const REFRESH_INTERVAL_MS = 4_000;
const WINDOW_OPTIONS = [15, 30, 60];

// Empty string means "same origin" — the default when frontend and backend
// share a domain (e.g. behind nginx in Docker). Set to the deployed API's
// origin when they're on different domains (e.g. Vercel + Railway).
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const DEFAULT_DATA_MODE = import.meta.env.VITE_DATA_MODE || "demo";

function DashboardPage({ onNavigate, dataMode = DEFAULT_DATA_MODE, fetchImpl = fetch }) {
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
        const payload =
          dataMode === "demo"
            ? createDemoMetrics(windowMinutes)
            : await fetchImpl(`${API_BASE_URL}/api/kpis?minutes=${windowMinutes}`, {
                signal: controller.signal,
                headers: { Accept: "application/json" },
              }).then((response) => {
                if (!response.ok) {
                  throw new Error(`Metrics request failed with ${response.status}`);
                }
                return response.json();
              });
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
  }, [dataMode, fetchImpl, windowMinutes]);

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
      <SiteHeader currentPath="/dashboard" onNavigate={onNavigate} />

      <main>
        <div className={`data-banner data-banner--${dataMode}`} role="note">
          <span className="data-banner__mark" aria-hidden="true" />
          <p>
            <strong>{dataMode === "demo" ? "Interactive showcase" : "Live pipeline"}</strong>
            {dataMode === "demo"
              ? "Deterministic sample telemetry is running in this browser. The repository includes the full live Kafka stack."
              : "Telemetry is flowing from Kafka through PostgreSQL and the metrics API."}
          </p>
          <a href="https://github.com/aaryabookseller16/Stream-Sense" rel="noreferrer" target="_blank">
            View architecture <span aria-hidden="true">↗</span>
          </a>
        </div>
        <section className="hero">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h1>Know what your services are doing—right now.</h1>
            <p className="hero__copy">
              Live traffic, latency, and failure signals across every active service.
            </p>
          </div>
          <div className="hero__controls">
            <div className="dashboard-status" aria-live="polite">
              <span className={`live-dot live-dot--${systemStatus}`} aria-hidden="true" />
              <span>System {systemStatus}</span>
            </div>
            <div className="window-picker" aria-label="Metrics time window">
              {WINDOW_OPTIONS.map((option) => (
                <button
                  aria-pressed={windowMinutes === option}
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
              {dataMode === "demo" ? "Simulated" : "Updated"} {formatTime(metrics?.generated_at)}
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
                <p className="panel__note">
                  UTC-normalized · {dataMode === "demo" ? "sample data" : "refreshes every 4s"}
                </p>
              </div>
              <RecentMinutes timeline={metrics?.timeline || []} />
            </section>
          </>
        )}
      </main>

      <footer>
        <span>StreamSense Reactor</span>
        <span>{dataMode === "demo" ? "Browser showcase · reproducible sample data" : "Kafka → Worker → PostgreSQL → API"}</span>
      </footer>
    </div>
  );
}

export default DashboardPage;
