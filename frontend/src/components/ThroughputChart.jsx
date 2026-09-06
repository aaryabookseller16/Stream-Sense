import { formatMinute } from "./formatters.js";

// The "Recent minute buckets" table below renders this same timeline data in
// an accessible, real HTML table — this chart is the visual complement, not
// the only way to reach the values.
export function ThroughputChart({ timeline }) {
  const maxEvents = Math.max(1, ...timeline.map((point) => point.event_count));
  const labelStep = Math.max(1, Math.floor(timeline.length / 5));

  return (
    <div className="chart" aria-label="Request throughput by minute" role="img">
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
                  <span className="chart__errors" style={{ height: `${errorHeight}%` }} />
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
