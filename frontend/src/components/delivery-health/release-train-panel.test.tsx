// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReleaseTrainPanel } from "./release-train-panel";
import type { ReleaseTrainOnTime } from "@/lib/delivery-health/types";

const ON_TIME: ReleaseTrainOnTime = {
  status: "computed",
  interval_days: 14,
  anchor_date: "2026-08-17T10:33:21Z",
  planned_trains: 1,
  trains_delivered: 1,
  on_time_rate: 1,
  missed_train_numbers: [],
};

const NOW = "2026-08-19T02:47:53.000Z";

describe("ReleaseTrainPanel", () => {
  it("renders the on-time rate headline", () => {
    render(
      <ReleaseTrainPanel
        onTime={ON_TIME}
        deliveredTrains={[1]}
        now={NOW}
      />,
    );
    expect(screen.getByText("100.0%")).toBeInTheDocument();
    expect(screen.getByText(/1 of 1 planned train/)).toBeInTheDocument();
  });

  it("lists the departed train as delivered", () => {
    render(
      <ReleaseTrainPanel
        onTime={ON_TIME}
        deliveredTrains={[1]}
        now={NOW}
      />,
    );
    expect(screen.getByText("Train 1")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("shows the next pending train with its cutoff", () => {
    render(
      <ReleaseTrainPanel
        onTime={ON_TIME}
        deliveredTrains={[1]}
        now={NOW}
      />,
    );
    expect(screen.getByText("Train 2")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText(/cutoff 2026-08-28/)).toBeInTheDocument();
  });

  it("marks a departed train without a release as missed", () => {
    render(
      <ReleaseTrainPanel
        onTime={{ ...ON_TIME, planned_trains: 2, trains_delivered: 1, on_time_rate: 0.5, missed_train_numbers: [2] }}
        deliveredTrains={[1]}
        now={NOW}
      />,
    );
    expect(screen.getByText("Missed")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
  });

  it("renders an honest empty state when the on-time signal is insufficient", () => {
    render(
      <ReleaseTrainPanel
        onTime={{
          status: "insufficient-data",
          value: null,
          note: "no releases in window to compare against the train calendar",
        }}
        deliveredTrains={[]}
        now={NOW}
      />,
    );
    expect(screen.getByText("Insufficient data")).toBeInTheDocument();
    expect(
      screen.getByText(/no releases in window to compare/),
    ).toBeInTheDocument();
  });
});