// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeliveryHealthPage } from "./delivery-health-page";
import type { DeliverySnapshot } from "@/lib/delivery-health/types";

const NOW = "2026-08-19T02:47:53.000Z";

function snapshot(overrides: Partial<DeliverySnapshot> = {}): DeliverySnapshot {
  return {
    kind: "delivery-snapshot",
    generated_at: "2026-08-19T02:47:53.480Z",
    repository: "frdrpo/learning-pdm-fintech-delivery-engine",
    metrics: {
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
    },
    audit: {
      generated_at: "2026-08-19T02:47:53.480Z",
      repository: "frdrpo/learning-pdm-fintech-delivery-engine",
      lookback_days: 90,
      window_start: "2026-05-21T02:47:53.480Z",
      deployments: [
        {
          id: 1,
          environment: "production",
          ref: "abc123",
          description: null,
          created_at: "2026-08-18T08:11:32.000Z",
        },
      ],
      releases: [
        { tag: "v0.3.0", name: "Release v0.3.0", published_at: "2026-08-18T08:11:32.000Z" },
      ],
      merged_pulls: [
        {
          number: 158,
          title: "docs(P21): chapter close-out",
          merge_commit_sha: "f2f1d889",
          merged_at: "2026-08-19T01:46:50.000Z",
        },
      ],
      failure_events: [],
      release_trains: [
        { train: 1, planned_departure: "2026-08-17T10:33:21.000Z", delivered: true },
      ],
    },
    ...overrides,
  };
}

describe("DeliveryHealthPage", () => {
  it("renders the DORA metrics, train status, and audit trail from the snapshot", () => {
    render(<DeliveryHealthPage snapshot={snapshot()} now={NOW} />);
    expect(screen.getByText("Deployment frequency")).toBeInTheDocument();
    expect(screen.getByText("Release train status")).toBeInTheDocument();
    expect(screen.getByText("Audit trail")).toBeInTheDocument();
  });

  it("shows the snapshot generation timestamp", () => {
    render(<DeliveryHealthPage snapshot={snapshot()} now={NOW} />);
    expect(screen.getByText(/generated 2026-08-19/i)).toBeInTheDocument();
  });

  it("renders an honest empty state when no snapshot is committed", () => {
    render(<DeliveryHealthPage snapshot={null} now={NOW} />);
    expect(screen.getByText(/no delivery snapshot/i)).toBeInTheDocument();
    expect(
      screen.getByText(/scripts\/delivery-telemetry\.mjs/i),
    ).toBeInTheDocument();
  });

  it("flags a stale snapshot without hiding its real data", () => {
    const stale = snapshot({ generated_at: "2026-05-01T00:00:00.000Z" });
    render(<DeliveryHealthPage snapshot={stale} now={NOW} />);
    expect(screen.getByText(/stale/i)).toBeInTheDocument();
    expect(screen.getByText("Deployment frequency")).toBeInTheDocument();
  });
});