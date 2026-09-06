import { formatNumber, formatMinute } from "./formatters.js";

export function RecentMinutes({ timeline }) {
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
                  <time dateTime={point.minute_bucket}>{formatMinute(point.minute_bucket)}</time>
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
