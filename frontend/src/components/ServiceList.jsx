import { StatusPill } from "./StatusPill.jsx";
import { formatNumber } from "./formatters.js";

export function ServiceList({ services }) {
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
