// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isSnapshotStale,
  loadDeliverySnapshot,
  parseDeliverySnapshot,
} from "./snapshot";

const NOW = new Date("2026-08-19T02:47:53.480Z");

type SnapshotInput = Record<string, unknown> & {
  kind: string;
  generated_at: string;
  repository: string;
  metrics: Record<string, unknown>;
  audit?: Record<string, unknown>;
};

function validInput(): SnapshotInput {
  return {
    kind: "delivery-snapshot",
    generated_at: NOW.toISOString(),
    repository: "frdrpo/learning-pdm-fintech-delivery-engine",
    metrics: {
      generated_at: NOW.toISOString(),
      window: { days: 90, start: "2026-05-21T02:47:53.480Z", end: NOW.toISOString() },
      counts: { deployments: 1, releases: 1, merged_pulls: 1, failure_events: 0 },
      deployment_frequency_per_week: { development: { count: 1, per_week: 0.5 } },
      lead_time_for_changes_hours: { status: "computed", hours: 0.1, prs_sampled: 2 },
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
      generated_at: NOW.toISOString(),
      repository: "frdrpo/learning-pdm-fintech-delivery-engine",
      lookback_days: 90,
      window_start: "2026-05-21T02:47:53.480Z",
      deployments: [
        {
          id: 1,
          environment: "development",
          ref: "abc123",
          description: null,
          created_at: "2026-08-18T02:39:39.000Z",
        },
      ],
      releases: [],
      merged_pulls: [],
      failure_events: [],
      release_trains: [
        { train: 1, planned_departure: "2026-08-17T10:33:21Z", delivered: true },
      ],
    },
  };
}

describe("parseDeliverySnapshot", () => {
  it("accepts a well-formed snapshot and preserves its labels", () => {
    const snapshot = parseDeliverySnapshot(validInput());
    expect(snapshot).not.toBeNull();
    expect(snapshot?.kind).toBe("delivery-snapshot");
    expect(snapshot?.repository).toContain("frdrpo");
    expect(snapshot?.generated_at).toBe(NOW.toISOString());
  });

  it("preserves timestamps from the underlying telemetry export", () => {
    const snapshot = parseDeliverySnapshot(validInput());
    expect(snapshot?.metrics.generated_at).toBe(NOW.toISOString());
    expect(snapshot?.metrics.window.start).toBe("2026-05-21T02:47:53.480Z");
    expect(snapshot?.audit.generated_at).toBe(NOW.toISOString());
  });

  it("carries computed and insufficient-data metrics through unchanged", () => {
    const snapshot = parseDeliverySnapshot(validInput());
    expect(snapshot?.metrics.lead_time_for_changes_hours.status).toBe("computed");
    expect(snapshot?.metrics.change_failure_rate.status).toBe("insufficient-data");
    const cfr = snapshot?.metrics.change_failure_rate as
      | { status: "insufficient-data"; note: string }
      | undefined;
    expect(cfr?.note).toContain("no failure");
  });

  describe("rejects malformed snapshots (honest empty state, never invented numbers)", () => {
    it("returns null for null and undefined", () => {
      expect(parseDeliverySnapshot(null)).toBeNull();
      expect(parseDeliverySnapshot(undefined)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(parseDeliverySnapshot("nope")).toBeNull();
      expect(parseDeliverySnapshot(42)).toBeNull();
    });

    it("returns null when the kind label is missing or wrong", () => {
      expect(parseDeliverySnapshot({ ...validInput(), kind: "simulation" })).toBeNull();
      expect(parseDeliverySnapshot({ ...validInput(), kind: undefined })).toBeNull();
    });

    it("returns null when metrics are missing", () => {
      const { metrics: _metrics, ...rest } = validInput();
      void _metrics;
      expect(parseDeliverySnapshot(rest)).toBeNull();
    });

    it("returns null when audit is missing", () => {
      const input = validInput();
      delete input.audit;
      expect(parseDeliverySnapshot(input)).toBeNull();
    });

    it("returns null when generated_at is not an ISO timestamp", () => {
      expect(
        parseDeliverySnapshot({ ...validInput(), generated_at: "yesterday" }),
      ).toBeNull();
    });
  });
});

describe("loadDeliverySnapshot", () => {
  it("loads the committed snapshot from the frontend bundle", () => {
    const snapshot = loadDeliverySnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.kind).toBe("delivery-snapshot");
    expect(snapshot?.metrics).toBeDefined();
    expect(snapshot?.audit).toBeDefined();
  });
});

describe("isSnapshotStale", () => {
  it("is false for a freshly generated snapshot", () => {
    const snapshot = parseDeliverySnapshot(validInput());
    expect(isSnapshotStale(snapshot!, 30, NOW)).toBe(false);
  });

  it("is true when the snapshot predates the maximum age", () => {
    const snapshot = parseDeliverySnapshot({
      ...validInput(),
      generated_at: "2026-05-01T00:00:00.000Z",
    });
    expect(isSnapshotStale(snapshot!, 30, NOW)).toBe(true);
  });

  it("is true when the generated_at timestamp is unreadable", () => {
    const snapshot = parseDeliverySnapshot(validInput());
    const withBadDate = { ...snapshot!, generated_at: "not-a-date" };
    expect(isSnapshotStale(withBadDate, 30, NOW)).toBe(true);
  });
});
