// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildTrainWindows,
  trainCutoff,
  type TrainWindowInput,
} from "./train-window";

const ANCHOR = "2026-08-17T10:33:21.000Z"; // earliest release (train 1 departure)
const INTERVAL_DAYS = 14;
const NOW = "2026-08-19T02:47:53.000Z";

function input(overrides: Partial<TrainWindowInput> = {}): TrainWindowInput {
  return {
    anchorDate: ANCHOR,
    intervalDays: INTERVAL_DAYS,
    now: NOW,
    deliveredTrains: [1],
    plannedTrains: 1,
    cutoffBufferDays: 3,
    ...overrides,
  };
}

describe("trainCutoff", () => {
  it("subtracts the buffer from the departure date", () => {
    expect(trainCutoff("2026-08-31T10:33:21.000Z", 3)).toBe(
      "2026-08-28T10:33:21.000Z",
    );
  });

  it("keeps the time-of-day when subtracting the buffer", () => {
    expect(trainCutoff("2026-09-14T10:33:21.000Z", 3)).toBe(
      "2026-09-11T10:33:21.000Z",
    );
  });

  it("rejects a non-positive buffer", () => {
    expect(() => trainCutoff("2026-08-31T10:33:21.000Z", 0)).toThrow(RangeError);
  });
});

describe("buildTrainWindows", () => {
  it("builds the departed train plus the next pending train", () => {
    const windows = buildTrainWindows(input());
    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({
      train: 1,
      departure: "2026-08-17T10:33:21.000Z",
      cutoff: "2026-08-14T10:33:21.000Z",
      status: "delivered",
    });
    expect(windows[1]).toMatchObject({
      train: 2,
      departure: "2026-08-31T10:33:21.000Z",
      cutoff: "2026-08-28T10:33:21.000Z",
      status: "pending",
    });
  });

  it("marks a departed train with no release as missed", () => {
    const windows = buildTrainWindows(
      input({ deliveredTrains: [], plannedTrains: 1 }),
    );
    expect(windows[0].status).toBe("missed");
  });

  it("extends the horizon for later planned trains", () => {
    const windows = buildTrainWindows(
      input({ deliveredTrains: [1, 3], plannedTrains: 3 }),
    );
    expect(windows.map((w) => w.train)).toEqual([1, 2, 3, 4]);
    expect(windows[0].status).toBe("delivered");
    expect(windows[1].status).toBe("missed");
    expect(windows[2].status).toBe("delivered");
    expect(windows[3].status).toBe("pending");
  });

  it("derives each window from the anchor plus the interval", () => {
    const windows = buildTrainWindows(input({ plannedTrains: 2 }));
    expect(windows[1].departure).toBe("2026-08-31T10:33:21.000Z");
    expect(windows[2].departure).toBe("2026-09-14T10:33:21.000Z");
  });

  it("returns an empty list when there is no anchor (insufficient data)", () => {
    expect(buildTrainWindows(input({ anchorDate: null }))).toEqual([]);
  });

  it("returns an empty list when the anchor is not a date", () => {
    expect(buildTrainWindows(input({ anchorDate: "not-a-date" }))).toEqual([]);
  });

  it("rejects a non-positive interval", () => {
    expect(() => buildTrainWindows(input({ intervalDays: 0 }))).toThrow(
      RangeError,
    );
  });

  it("rejects a negative planned train count", () => {
    expect(() => buildTrainWindows(input({ plannedTrains: -1 }))).toThrow(
      RangeError,
    );
  });

  it("labels every window with an ISO departure", () => {
    for (const window of buildTrainWindows(input({ plannedTrains: 4 }))) {
      expect(new Date(window.departure).toISOString()).toBe(window.departure);
    }
  });
});
