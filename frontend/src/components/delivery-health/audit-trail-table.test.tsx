// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditTrailTable } from "./audit-trail-table";
import type { DeliveryAudit } from "@/lib/delivery-health/types";

function audit(overrides: Partial<DeliveryAudit> = {}): DeliveryAudit {
  return {
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
      {
        id: 2,
        environment: "development",
        ref: "def456",
        description: "dry-run",
        created_at: "2026-08-18T02:39:39.000Z",
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
    failure_events: [
      {
        number: 105,
        title: "OPS drill: controlled failure on development",
        created_at: "2026-08-18T00:53:47.000Z",
      },
    ],
    release_trains: [
      { train: 1, planned_departure: "2026-08-17T10:33:21.000Z", delivered: true },
    ],
    ...overrides,
  };
}

describe("AuditTrailTable", () => {
  it("renders a row per audit event with its type", () => {
    render(<AuditTrailTable audit={audit()} />);
    expect(screen.getAllByText("Deployment").length).toBe(2);
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(screen.getByText("Merged PR")).toBeInTheDocument();
    expect(screen.getByText("Failure event")).toBeInTheDocument();
  });

  it("shows the environment and ref for deployments", () => {
    render(<AuditTrailTable audit={audit()} />);
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("shows the release tag", () => {
    render(<AuditTrailTable audit={audit()} />);
    expect(screen.getByText("v0.3.0")).toBeInTheDocument();
  });

  it("shows the merged PR number and title", () => {
    render(<AuditTrailTable audit={audit()} />);
    expect(screen.getByText("#158")).toBeInTheDocument();
    expect(screen.getByText("docs(P21): chapter close-out")).toBeInTheDocument();
  });

  it("shows the failure event title", () => {
    render(<AuditTrailTable audit={audit()} />);
    expect(
      screen.getByText("OPS drill: controlled failure on development"),
    ).toBeInTheDocument();
  });

  it("renders an honest empty state when there are no events", () => {
    render(
      <AuditTrailTable
        audit={audit({ deployments: [], releases: [], merged_pulls: [], failure_events: [] })}
      />,
    );
    expect(screen.getByText(/no audit events in this snapshot/i)).toBeInTheDocument();
  });

  it("caps the visible rows and reports the total", () => {
    const many = audit({
      deployments: Array.from({ length: 12 }, (_, i) => ({
        id: i,
        environment: "development",
        ref: `sha${i}`,
        description: null,
        created_at: "2026-08-18T08:11:32.000Z",
      })),
      releases: [],
      merged_pulls: [],
      failure_events: [],
    });
    render(<AuditTrailTable audit={many} maxRows={5} />);
    const rows = screen.getAllByRole("row");
    // header + 5 visible rows
    expect(rows).toHaveLength(6);
    expect(screen.getByText(/12 audit events/)).toBeInTheDocument();
  });

  it("sorts events newest first", () => {
    render(<AuditTrailTable audit={audit()} />);
    const rows = screen.getAllByRole("row");
    const firstRow = within(rows[1]).getByText("#158");
    expect(firstRow).toBeInTheDocument();
  });
});