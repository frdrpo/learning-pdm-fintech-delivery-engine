// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatDate, formatHours, formatPercent } from "./format";

describe("formatHours", () => {
  it("renders minutes for sub-hour values", () => {
    expect(formatHours(0.09)).toBe("5m");
  });

  it("renders hours and minutes", () => {
    expect(formatHours(7.25)).toBe("7h 15m");
  });

  it("renders days and hours", () => {
    expect(formatHours(26.5)).toBe("1d 2h");
  });

  it("renders a whole number of hours", () => {
    expect(formatHours(3)).toBe("3h 0m");
  });

  it("renders zero as 0m", () => {
    expect(formatHours(0)).toBe("0m");
  });
});

describe("formatPercent", () => {
  it("renders a ratio as a one-decimal percentage", () => {
    expect(formatPercent(0.01)).toBe("1.0%");
  });

  it("renders 100 percent", () => {
    expect(formatPercent(1)).toBe("100.0%");
  });

  it("renders zero percent", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatDate", () => {
  it("renders an ISO timestamp as a short date", () => {
    expect(formatDate("2026-08-17T10:33:21.000Z")).toBe("2026-08-17");
  });

  it("renders null as an em dash", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("renders an unreadable timestamp as an em dash", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});