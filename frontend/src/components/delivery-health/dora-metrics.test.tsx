// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DoraMetricCard } from "./dora-metric-card";
import { DoraMetricsGrid } from "./dora-metrics-grid";
import type { DeliveryMetrics } from "@/lib/delivery-health/types";

function metrics(overrides: Partial<DeliveryMetrics> = {}): DeliveryMetrics {
  return {
    generated_at: "2026-08-19T02:47:53.480Z",
    window: { days: 90, start: "2026-05-21T02:47:53.480Z", end: "2026-08-19T02:47:53.480Z" },
    counts: { deployments: 100, releases: 3, merged_pulls: 70, failure_events: 1 },
    deployment_frequency_per_week: {
      development: { count: 22, per_week: 1.711111111111111 },
      staging: { count: 21, per_week: 1.6333333333333333 },
      production: { count: 20, per_week: 1.5555555555555556 },
    },
    lead_time_for_changes_hours: { status: "computed", hours: 0.09, prs_sampled: 11 },
    change_failure_rate: { status: "computed", deployments: 100, failures: 1, ratio: 0.01 },
    time_to_recovery_hours: { status: "computed", hours: 25.64, events_sampled: 1 },
    release_train_on_time: {
      status: "computed",
      interval_days: 14,
      anchor_date: "2026-08-17T10:33:21Z",
      planned_trains: 1,
      trains_delivered: 1,
      on_time_rate: 1,
      missed_train_numbers: [],
    },
    ...overrides,
  };
}

describe("DoraMetricCard", () => {
  it("renders the label, headline value, and detail", () => {
    render(
      <DoraMetricCard
        label="Lead time for changes"
        value="5m"
        detail="median of 11 merged PRs"
        windowLabel="last 90 days"
      />,
    );
    expect(screen.getByText("Lead time for changes")).toBeInTheDocument();
    expect(screen.getByText("5m")).toBeInTheDocument();
    expect(screen.getByText("median of 11 merged PRs")).toBeInTheDocument();
  });

  it("renders an honest insufficient-data state with the note", () => {
    render(
      <DoraMetricCard
        label="Change failure rate"
        value={null}
        detail="no failure events in window"
        windowLabel="last 90 days"
      />,
    );
    expect(screen.getByText("Insufficient data")).toBeInTheDocument();
    expect(screen.getByText("no failure events in window")).toBeInTheDocument();
  });
});

describe("DoraMetricsGrid", () => {
  it("renders all four DORA metric cards from the snapshot metrics", () => {
    render(<DoraMetricsGrid metrics={metrics()} />);
    expect(screen.getByText("Deployment frequency")).toBeInTheDocument();
    expect(screen.getByText("Lead time for changes")).toBeInTheDocument();
    expect(screen.getByText("Change failure rate")).toBeInTheDocument();
    expect(screen.getByText("Time to recovery")).toBeInTheDocument();
  });

  it("shows the production deployment frequency as the headline", () => {
    render(<DoraMetricsGrid metrics={metrics()} />);
    expect(screen.getByText("1.6/wk")).toBeInTheDocument();
  });

  it("shows the lead time headline in human-readable form", () => {
    render(<DoraMetricsGrid metrics={metrics()} />);
    expect(screen.getByText("5m")).toBeInTheDocument();
  });

  it("shows the change-failure rate as a percentage", () => {
    render(<DoraMetricsGrid metrics={metrics()} />);
    expect(screen.getByText("1.0%")).toBeInTheDocument();
  });

  it("shows the MTTR proxy headline in human-readable form", () => {
    render(<DoraMetricsGrid metrics={metrics()} />);
    expect(screen.getByText("1d 1h")).toBeInTheDocument();
  });

  it("renders insufficient-data cards when metrics are not computed", () => {
    render(
      <DoraMetricsGrid
        metrics={metrics({
          lead_time_for_changes_hours: {
            status: "insufficient-data",
            value: null,
            note: "no deployment matched a merged PR",
          },
          change_failure_rate: {
            status: "insufficient-data",
            value: null,
            note: "no failure events in window",
          },
          time_to_recovery_hours: {
            status: "insufficient-data",
            value: null,
            note: "no failure events in window",
          },
        })}
      />,
    );
    expect(screen.getAllByText("Insufficient data").length).toBe(3);
  });

  it("shows the measurement window on every card", () => {
    render(<DoraMetricsGrid metrics={metrics()} />);
    expect(screen.getAllByText(/last 90 days/).length).toBe(4);
  });
});