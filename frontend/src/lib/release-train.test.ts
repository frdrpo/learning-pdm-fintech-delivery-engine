// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  simulateReleaseTrain,
  type ReleaseTrainConfig,
} from "./release-train";

function baseConfig(overrides: Partial<ReleaseTrainConfig> = {}): ReleaseTrainConfig {
  return {
    trainIntervalDays: 14,
    capacity: 3,
    gatePassRate: 1,
    slipPolicy: "carry",
    seed: 42,
    maxTrains: 10,
    backlog: [
      { id: "feat-a", size: 2, readiness: 1 },
      { id: "feat-b", size: 3, readiness: 1 },
      { id: "feat-c", size: 1, readiness: 1 },
    ],
    ...overrides,
  };
}

describe("simulateReleaseTrain", () => {
  describe("determinism", () => {
    it("produces identical outcomes for the same seed and config", () => {
      const config = baseConfig({ seed: 1234 });
      expect(simulateReleaseTrain(config)).toEqual(
        simulateReleaseTrain(config),
      );
    });

    it("does not mutate the backlog input", () => {
      const config = baseConfig();
      const snapshot = JSON.stringify(config.backlog);
      simulateReleaseTrain(config);
      expect(JSON.stringify(config.backlog)).toBe(snapshot);
    });
  });

  describe("self-labeling contract", () => {
    it("labels every output as simulation", () => {
      const result = simulateReleaseTrain(baseConfig());
      expect(result.kind).toBe("simulation");
      expect(result.trains.every((t) => t.kind === "simulation")).toBe(true);
      expect(
        result.features.every((f) => f.kind === "simulation"),
      ).toBe(true);
    });
  });

  describe("boarding under perfect conditions", () => {
    it("boards everything on train 1 with zero delay when nothing constrains it", () => {
      const result = simulateReleaseTrain(baseConfig());
      expect(result.trains[0].features).toEqual(["feat-a", "feat-b", "feat-c"]);
      expect(result.trains).toHaveLength(1);
      expect(result.features.every((f) => f.status === "on-time")).toBe(true);
      expect(result.features.every((f) => f.delayTrains === 0)).toBe(true);
      expect(result.throughput).toBe(1);
      expect(result.onTimeRate).toBe(1);
      expect(result.averageDelayTrains).toBe(0);
    });
  });

  describe("capacity limits", () => {
    it("spreads boarding across trains when capacity is smaller than the backlog", () => {
      const result = simulateReleaseTrain(
        baseConfig({ capacity: 1, maxTrains: 10 }),
      );
      expect(result.trains).toHaveLength(3);
      expect(result.trains.map((t) => t.features)).toEqual([
        ["feat-a"],
        ["feat-b"],
        ["feat-c"],
      ]);
      expect(result.features.find((f) => f.id === "feat-a")?.status).toBe(
        "on-time",
      );
      expect(result.features.find((f) => f.id === "feat-b")?.status).toBe(
        "slipped",
      );
      expect(result.features.find((f) => f.id === "feat-b")?.delayTrains).toBe(
        1,
      );
      expect(result.features.find((f) => f.id === "feat-c")?.delayTrains).toBe(
        2,
      );
      expect(result.onTimeRate).toBe(1 / 3);
      expect(result.averageDelayTrains).toBe(1);
    });
  });

  describe("slip handling", () => {
    it("carries unready features onto later trains", () => {
      const result = simulateReleaseTrain(
        baseConfig({
          backlog: [
            { id: "feat-early", size: 1, readiness: 1 },
            { id: "feat-late", size: 1, readiness: 0 },
          ],
          seed: 7,
          maxTrains: 5,
        }),
      );
      const late = result.features.find((f) => f.id === "feat-late");
      expect(late?.status).toBe("unboarded");
      expect(late?.trainBoarded).toBeNull();
    });
  });

  describe("gate pass rate", () => {
    it("boards nothing when the gate always fails", () => {
      const result = simulateReleaseTrain(baseConfig({ gatePassRate: 0 }));
      expect(result.trains).toHaveLength(0);
      expect(result.throughput).toBe(0);
      expect(result.features.every((f) => f.status === "unboarded")).toBe(true);
    });

    it("boards everything when the gate always passes", () => {
      const result = simulateReleaseTrain(baseConfig({ gatePassRate: 1 }));
      expect(result.throughput).toBe(1);
    });
  });

  describe("readiness", () => {
    it("boards nothing when no feature is ever ready", () => {
      const result = simulateReleaseTrain(
        baseConfig({
          backlog: [
            { id: "feat-a", size: 1, readiness: 0 },
            { id: "feat-b", size: 1, readiness: 0 },
          ],
        }),
      );
      expect(result.throughput).toBe(0);
      expect(result.features.every((f) => f.status === "unboarded")).toBe(true);
    });
  });

  describe("horizon truncation", () => {
    it("stops after maxTrains and marks the rest unboarded", () => {
      const result = simulateReleaseTrain(
        baseConfig({ capacity: 1, maxTrains: 2, backlog: [
          { id: "a", size: 1, readiness: 1 },
          { id: "b", size: 1, readiness: 1 },
          { id: "c", size: 1, readiness: 1 },
        ] }),
      );
      expect(result.trains).toHaveLength(2);
      expect(result.features.filter((f) => f.status === "unboarded")).toHaveLength(
        1,
      );
      expect(result.throughput).toBe(2 / 3);
    });
  });

  describe("empty backlog", () => {
    it("returns an empty, well-formed result without NaN", () => {
      const result = simulateReleaseTrain(baseConfig({ backlog: [] }));
      expect(result.trains).toHaveLength(0);
      expect(result.features).toHaveLength(0);
      expect(result.throughput).toBe(0);
      expect(result.onTimeRate).toBe(0);
      expect(result.averageDelayTrains).toBe(0);
    });
  });

  describe("input validation", () => {
    it("rejects a non-positive capacity", () => {
      expect(() =>
        simulateReleaseTrain(baseConfig({ capacity: 0 })),
      ).toThrow(RangeError);
    });

    it("rejects an out-of-range gate pass rate", () => {
      expect(() =>
        simulateReleaseTrain(baseConfig({ gatePassRate: 1.5 })),
      ).toThrow(RangeError);
    });

    it("rejects an out-of-range readiness", () => {
      expect(() =>
        simulateReleaseTrain(
          baseConfig({ backlog: [{ id: "x", size: 1, readiness: 2 }] }),
        ),
      ).toThrow(RangeError);
    });

    it("rejects a non-integer seed", () => {
      expect(() => simulateReleaseTrain(baseConfig({ seed: 3.5 }))).toThrow(
        RangeError,
      );
    });
  });
});
