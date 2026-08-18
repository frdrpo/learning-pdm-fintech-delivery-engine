// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  boardingTrain,
  buildTrainCalendar,
  daysUntilDate,
  type TrainCalendarInput,
} from "./train-board";

const RELEASES = [
  { tag: "v0.1.0", publishedAt: new Date(Date.UTC(2026, 7, 17, 10, 33, 21)) },
  { tag: "v0.2.0", publishedAt: new Date(Date.UTC(2026, 7, 18, 2, 39, 39)) },
];

function calendarInput(
  now: Date,
  releases: TrainCalendarInput["releaseDates"] = RELEASES,
): TrainCalendarInput {
  return {
    anchor: new Date(Date.UTC(2026, 7, 17, 10, 33, 21)),
    now,
    intervalDays: 14,
    cutoffDays: 3,
    count: 3,
    releaseDates: releases,
  };
}

describe("buildTrainCalendar", () => {
  it("anchors train 1 at the earliest release and opens the next window after the interval", () => {
    const slots = buildTrainCalendar(
      calendarInput(new Date(Date.UTC(2026, 8, 1))),
    );
    expect(slots).toHaveLength(3);
    expect(slots[0].departure.toISOString()).toBe("2026-08-17T10:33:21.000Z");
    expect(slots[0].nextDeparture.toISOString()).toBe("2026-08-31T10:33:21.000Z");
  });

  it("places the readiness cutoff at departure minus the cutoff days", () => {
    const slots = buildTrainCalendar(
      calendarInput(new Date(Date.UTC(2026, 8, 1))),
    );
    expect(slots[1].departure.toISOString()).toBe("2026-08-31T10:33:21.000Z");
    expect(slots[1].cutoff.toISOString()).toBe("2026-08-28T10:33:21.000Z");
  });

  it("marks a train delivered when at least one release falls inside its window", () => {
    const slots = buildTrainCalendar(
      calendarInput(new Date(Date.UTC(2026, 8, 1))),
    );
    expect(slots[0].status).toBe("delivered");
    expect(slots[0].releases).toEqual(["v0.1.0", "v0.2.0"]);
  });

  it("keeps a future train pending without counting earlier releases into its window", () => {
    const slots = buildTrainCalendar(
      calendarInput(new Date(Date.UTC(2026, 8, 1))),
    );
    expect(slots[1].status).toBe("pending");
    expect(slots[1].releaseDates).toEqual([]);
    expect(slots[2].status).toBe("pending");
  });

  it("marks a fully past window with no release as missed", () => {
    const now = new Date(Date.UTC(2026, 9, 15)); // well after train 2's window
    const slots = buildTrainCalendar(calendarInput(now));
    expect(slots[0].status).toBe("delivered");
    expect(slots[1].status).toBe("missed");
  });

  it("keeps the window still open as pending even after its departure has passed", () => {
    const now = new Date(Date.UTC(2026, 8, 2)); // inside train 2's window
    const slots = buildTrainCalendar(calendarInput(now));
    expect(slots[1].status).toBe("pending");
  });

  it("derives the on-time rate as delivered over planned trains", () => {
    const now = new Date(Date.UTC(2026, 9, 15));
    const slots = buildTrainCalendar(calendarInput(now));
    const delivered = slots.filter((s) => s.status === "delivered").length;
    expect(delivered).toBe(1);
    expect(delivered / slots.length).toBeCloseTo(1 / 3);
  });
});

describe("boardingTrain", () => {
  it("returns the first pending train as the one boarding now", () => {
    const slots = buildTrainCalendar(
      calendarInput(new Date(Date.UTC(2026, 8, 1))),
    );
    expect(boardingTrain(slots)?.id).toBe(2);
  });

  it("returns undefined when no train is pending and at least one is planned", () => {
    const slots = buildTrainCalendar({
      ...calendarInput(new Date(Date.UTC(2026, 9, 15))),
    });
    expect(boardingTrain(slots)).toBeUndefined();
  });
});

describe("daysUntilDate", () => {
  it("counts whole days between now and a future date", () => {
    const now = new Date(Date.UTC(2026, 7, 18));
    const cutoff = new Date(Date.UTC(2026, 7, 28));
    expect(daysUntilDate(cutoff, now)).toBe(10);
  });

  it("is negative once the date is in the past", () => {
    const now = new Date(Date.UTC(2026, 8, 5));
    const cutoff = new Date(Date.UTC(2026, 7, 28));
    expect(daysUntilDate(cutoff, now)).toBeLessThan(0);
  });
});