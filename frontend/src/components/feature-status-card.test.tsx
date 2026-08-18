// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureStatusCard } from "./feature-status-card";

describe("FeatureStatusCard", () => {
  it("renders the feature name and description", () => {
    render(
      <FeatureStatusCard
        name="Live verify target"
        description="Curls the deployed URL after promotion."
        rank="ready"
      />,
    );
    expect(screen.getByText("Live verify target")).toBeInTheDocument();
    expect(screen.getByText(/curls the deployed url/i)).toBeInTheDocument();
  });

  it("labels each rank correctly", () => {
    const { rerender } = render(
      <FeatureStatusCard name="a" description="d" rank="ready" />,
    );
    expect(screen.getByRole("status", { name: "Ready" })).toBeInTheDocument();

    rerender(<FeatureStatusCard name="a" description="d" rank="in-flight" />);
    expect(screen.getByRole("status", { name: "In flight" })).toBeInTheDocument();

    rerender(<FeatureStatusCard name="a" description="d" rank="blocked" />);
    expect(screen.getByRole("status", { name: "Blocked" })).toBeInTheDocument();
  });

  it("shows the boarding train when provided", () => {
    render(
      <FeatureStatusCard
        name="a"
        description="d"
        rank="ready"
        train={2}
      />,
    );
    expect(screen.getByText("Train 2")).toBeInTheDocument();
  });

  it("omits the train chip when no train is assigned", () => {
    render(<FeatureStatusCard name="a" description="d" rank="ready" />);
    expect(screen.queryByText(/train/i)).not.toBeInTheDocument();
  });
});