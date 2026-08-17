// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isReadyForRelease } from "./delivery";

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