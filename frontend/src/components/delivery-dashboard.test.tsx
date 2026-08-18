// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeliveryDashboard } from "./delivery-dashboard";

const healthy = {
  gates: {
    lint: "pass" as const,
    test: "pass" as const,
    build: "pass" as const,
    compliance: "pass" as const,
  },
  train: {
    featuresReady: 3,
    featuresTotal: 3,
    gateHealth: {
      lint: "pass" as const,
      test: "pass" as const,
      build: "pass" as const,
      compliance: "pass" as const,
    },
    daysUntilTrain: 5,
  },
};

describe("DeliveryDashboard", () => {
  it("labels the train as on schedule when everything is green", () => {
    render(<DeliveryDashboard {...healthy} />);
    expect(screen.getByRole("status", { name: /on schedule/i })).toBeInTheDocument();
  });

  it("renders one gate row per quality gate with the aggregated outcome", () => {
    render(<DeliveryDashboard {...healthy} />);
    for (const gate of ["lint", "test", "build", "compliance"]) {
      expect(screen.getByText(gate)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Pass").length).toBe(4);
  });

  it("shows the feature-readiness and time-to-train counters", () => {
    render(<DeliveryDashboard {...healthy} />);
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("reports no blockers when gates pass", () => {
    render(<DeliveryDashboard {...healthy} />);
    expect(screen.getByText(/no blockers/i)).toBeInTheDocument();
  });

  it("flips to at-risk and lists the blocked gate when a gate fails", () => {
    render(
      <DeliveryDashboard
        gates={{ ...healthy.gates, compliance: "fail" }}
        train={{
          ...healthy.train,
          gateHealth: { ...healthy.train.gateHealth, compliance: "fail" },
        }}
      />,
    );
    expect(screen.getByRole("status", { name: /at risk/i })).toBeInTheDocument();
    expect(screen.getByText(/blocked by: compliance/i)).toBeInTheDocument();
  });

  it("labels the train as slipped after the boarding date passes with features outstanding", () => {
    render(
      <DeliveryDashboard
        {...healthy}
        train={{ ...healthy.train, featuresReady: 2, daysUntilTrain: 0 }}
      />,
    );
    expect(screen.getByRole("status", { name: /slipped/i })).toBeInTheDocument();
  });
});