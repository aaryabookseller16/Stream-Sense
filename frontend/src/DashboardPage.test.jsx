import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./DashboardPage.jsx";

function jsonResponse(body, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DashboardPage", () => {
  it("shows a loading state before the first fetch resolves", () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage onNavigate={() => {}} />);
    expect(screen.getByLabelText(/loading telemetry/i)).toBeInTheDocument();
  });

  it("shows an error state and keeps retrying when the request fails", async () => {
    fetch.mockReturnValue(jsonResponse({ error: "metrics_unavailable" }, false, 503));
    render(<DashboardPage onNavigate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/connection interrupted/i)).toBeInTheDocument();
    });
  });

  it("renders empty states when no services have reported in yet", async () => {
    fetch.mockReturnValue(
      jsonResponse({
        generated_at: "2026-01-20T12:00:00.000Z",
        window_minutes: 15,
        summary: {
          total_events: 0,
          events_per_minute: 0,
          error_rate: 0,
          avg_latency_ms: 0,
          p95_latency_ms: 0,
          active_services: 0,
        },
        timeline: [],
        services: [],
      })
    );

    render(<DashboardPage onNavigate={() => {}} />);

    expect(await screen.findByText(/listening for events/i)).toBeInTheDocument();
    expect(screen.getByText(/no completed metric windows yet/i)).toBeInTheDocument();
  });

  it("renders KPI values and service rows for a populated response", async () => {
    fetch.mockReturnValue(
      jsonResponse({
        generated_at: "2026-01-20T12:00:00.000Z",
        window_minutes: 15,
        summary: {
          total_events: 500,
          events_per_minute: 33.3,
          error_rate: 1.5,
          avg_latency_ms: 120,
          p95_latency_ms: 240,
          active_services: 2,
        },
        timeline: [
          { minute_bucket: "2026-01-20T11:59:00.000Z", event_count: 10, error_count: 0, avg_latency_ms: 100, p95_latency_ms: 150 },
        ],
        services: [
          {
            service: "checkout",
            event_count: 300,
            error_count: 3,
            error_rate: 1.0,
            avg_latency_ms: 110,
            p95_latency_ms: 200,
            last_seen: "2026-01-20T11:59:50.000Z",
            status: "healthy",
          },
        ],
      })
    );

    render(<DashboardPage onNavigate={() => {}} />);

    expect(await screen.findByText("500")).toBeInTheDocument();
    expect(screen.getByText("checkout")).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });
});
