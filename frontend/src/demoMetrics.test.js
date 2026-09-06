import { createDemoMetrics } from "./demoMetrics.js";

describe("createDemoMetrics", () => {
  const now = new Date("2026-09-06T19:15:30.000Z");

  it("returns the documented dashboard contract", () => {
    const payload = createDemoMetrics(15, now);

    expect(payload.window_minutes).toBe(15);
    expect(payload.timeline).toHaveLength(15);
    expect(payload.services).toHaveLength(5);
    expect(payload.summary.total_events).toBeGreaterThan(0);
    expect(payload.summary.active_services).toBe(5);
  });

  it("is reproducible for the same minute", () => {
    const first = createDemoMetrics(30, now);
    const second = createDemoMetrics(30, now);

    expect(second).toEqual(first);
  });

  it("uses contiguous UTC minute buckets", () => {
    const payload = createDemoMetrics(5, now);
    const gaps = payload.timeline.slice(1).map((point, index) => {
      const previous = payload.timeline[index];
      return new Date(point.minute_bucket) - new Date(previous.minute_bucket);
    });

    expect(gaps).toEqual([60_000, 60_000, 60_000, 60_000]);
  });
});
