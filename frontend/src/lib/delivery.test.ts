// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  aggregateGate,
  assessTrainReadiness,
  blockedGates,
  isReadyForRelease,
} from "./delivery";

describe("isReadyForRelease", () => {
  describe("positive scenarios", () => {
    it("is ready when every gate passed", () => {
      const gates = { lint: true, test: true, build: true, compliance: true };
      expect(isReadyForRelease(gates)).toBe(true);
    });
  });

  describe("negative scenarios", () => {
    it("is not ready when one gate failed", () => {
      const gates = { lint: true, test: false, build: true, compliance: true };
      expect(isReadyForRelease(gates)).toBe(false);
    });

    it("is not ready when every gate failed", () => {
      const gates = { lint: false, test: false, build: false, compliance: false };
      expect(isReadyForRelease(gates)).toBe(false);
    });

    it("is not ready when a gate is skipped", () => {
      const gates = { lint: true, test: true, build: true };
      expect(isReadyForRelease(gates)).toBe(false);
    });

    it("is not ready when there are no gates at all", () => {
      expect(isReadyForRelease({})).toBe(false);
    });

    it("is not ready when a gate is neither true nor false", () => {
      const gates = {
        lint: true,
        test: true,
        build: true,
        compliance: null as unknown as boolean,
      };
      expect(isReadyForRelease(gates)).toBe(false);
    });
  });
});

describe("aggregateGate", () => {
  it("is pass when every gate passed", () => {
    const gates = { lint: "pass", test: "pass", build: "pass", compliance: "pass" } as const;
    expect(aggregateGate(gates)).toBe("pass");
  });

  it("is fail when any gate failed", () => {
    const gates = { lint: "pass", test: "fail", build: "pass", compliance: "pass" } as const;
    expect(aggregateGate(gates)).toBe("fail");
  });

  it("is pending when a gate is pending", () => {
    const gates = { lint: "pass", test: "pending", build: "pass", compliance: "pass" } as const;
    expect(aggregateGate(gates)).toBe("pending");
  });

  it("is pending when a gate is missing", () => {
    expect(aggregateGate({ lint: "pass", test: "pass", build: "pass" })).toBe(
      "pending",
    );
  });
});

describe("assessTrainReadiness", () => {
  const healthy = {
    featuresReady: 3,
    featuresTotal: 3,
    gateHealth: {
      lint: "pass",
      test: "pass",
      build: "pass",
      compliance: "pass",
    } as const,
    daysUntilTrain: 5,
  };

  it("is on-schedule when gates pass, features ready, and the train is ahead", () => {
    expect(assessTrainReadiness(healthy)).toBe("on-schedule");
  });

  it("is on-schedule when features are still boarding but gates pass", () => {
    const boarding = { ...healthy, featuresReady: 2, featuresTotal: 3 };
    expect(assessTrainReadiness(boarding)).toBe("on-schedule");
  });

  it("is at-risk when any gate failed", () => {
    const blocked = {
      ...healthy,
      gateHealth: { ...healthy.gateHealth, compliance: "fail" },
    } as const;
    expect(assessTrainReadiness(blocked)).toBe("at-risk");
  });

  it("is at-risk while a gate is still pending", () => {
    const pending = {
      ...healthy,
      gateHealth: { ...healthy.gateHealth, build: "pending" },
    } as const;
    expect(assessTrainReadiness(pending)).toBe("at-risk");
  });

  it("is slipped when the train date passed without every feature ready", () => {
    const missed: typeof healthy = { ...healthy, featuresReady: 2, daysUntilTrain: 0 };
    expect(assessTrainReadiness(missed)).toBe("slipped");
  });

  it("is still on-schedule on the train date when everything is ready", () => {
    const onDate: typeof healthy = { ...healthy, daysUntilTrain: 0 };
    expect(assessTrainReadiness(onDate)).toBe("on-schedule");
  });

  it("handles an empty feature set as ready", () => {
    const empty = { ...healthy, featuresReady: 0, featuresTotal: 0 };
    expect(assessTrainReadiness(empty)).toBe("on-schedule");
  });
});

describe("blockedGates", () => {
  it("returns the failing gates only", () => {
    const gates = { lint: "pass", test: "fail", build: "pass", compliance: "fail" } as const;
    expect(blockedGates(gates)).toEqual(["test", "compliance"]);
  });

  it("returns no gates when everything passes", () => {
    const gates = { lint: "pass", test: "pass", build: "pass", compliance: "pass" } as const;
    expect(blockedGates(gates)).toEqual([]);
  });

  it("ignores pending gates", () => {
    const gates = { lint: "pass", test: "pending", build: "pass", compliance: "pass" } as const;
    expect(blockedGates(gates)).toEqual([]);
  });
});