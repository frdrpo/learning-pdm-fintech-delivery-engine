// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildTrainCalendar, type TrainCalendarInput } from "@/lib/train-board";
import { TrainBoard } from "./train-board";

const RELEASES = [
  { tag: "v0.1.0", publishedAt: new Date(Date.UTC(2026, 7, 17, 10, 33, 21)) },
  { tag: "v0.2.0", publishedAt: new Date(Date.UTC(2026, 7, 18, 2, 39, 39)) },
];

function slots(now: Date = new Date(Date.UTC(2026, 7, 25))) {
  const input: TrainCalendarInput = {
    anchor: new Date(Date.UTC(2026, 7, 17, 10, 33, 21)),
    now,
    intervalDays: 14,
    cutoffDays: 3,
    count: 3,
    releaseDates: RELEASES,
  };
  return buildTrainCalendar(input);
}

describe("TrainBoard", () => {
  describe("positive scenarios", () => {
    it("renders one row per planned train with its window and cutoff", () => {
      render(<TrainBoard slots={slots()} now={new Date(Date.UTC(2026, 7, 25))} />);
      expect(screen.getByRole("heading", { name: /release train board/i })).toBeInTheDocument();
      expect(screen.getByText("Train 1")).toBeInTheDocument();
      expect(screen.getByText("Train 2")).toBeInTheDocument();
      expect(screen.getByText("Train 3")).toBeInTheDocument();
      // Window boundaries are shared between adjacent trains, so the date
      // appears once per train row.
      expect(screen.getAllByText(/2026-08-31/).length).toBe(2);
      expect(screen.getAllByText(/2026-09-14/).length).toBe(2);
      expect(screen.getAllByText(/2026-08-28/).length).toBe(1);
    });

    it("shows a Delivered badge for a train with a release and lists the releases", () => {
      render(<TrainBoard slots={slots()} now={new Date(Date.UTC(2026, 7, 25))} />);
      expect(screen.getAllByText("Delivered").length).toBe(1);
      expect(screen.getByText("v0.1.0, v0.2.0")).toBeInTheDocument();
    });

    it("labels the current boarding train and counts down to its cutoff", () => {
      render(<TrainBoard slots={slots()} now={new Date(Date.UTC(2026, 7, 25))} />);
      expect(screen.getByText(/boarding now/i)).toBeInTheDocument();
      expect(screen.getByText("3 days to cutoff")).toBeInTheDocument();
    });

    it("reflects the readiness signal of the boarding train when provided", () => {
      render(
        <TrainBoard
          slots={slots()}
          now={new Date(Date.UTC(2026, 7, 25))}
          readiness={{
            featuresReady: 3,
            featuresTotal: 4,
            gateHealth: {
              lint: "pass",
              test: "pass",
              build: "pass",
              compliance: "pass",
            } as const,
            daysUntilTrain: 6,
          }}
        />,
      );
      expect(screen.getByText("On schedule")).toBeInTheDocument();
    });
  });

  describe("negative scenarios", () => {
    it("flags a missed train honestly without a release", () => {
      const now = new Date(Date.UTC(2026, 9, 15));
      render(<TrainBoard slots={slots(now)} now={now} />);
      expect(screen.getAllByText("Missed").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/boarding now/i)).not.toBeInTheDocument();
    });

    it("shows At risk for the boarding train when a gate fails", () => {
      render(
        <TrainBoard
          slots={slots()}
          now={new Date(Date.UTC(2026, 7, 25))}
          readiness={{
            featuresReady: 2,
            featuresTotal: 4,
            gateHealth: {
              lint: "pass",
              test: "fail",
              build: "pass",
              compliance: "pass",
            } as const,
            daysUntilTrain: 6,
          }}
        />,
      );
      expect(screen.getByText("At risk")).toBeInTheDocument();
    });
  });
});