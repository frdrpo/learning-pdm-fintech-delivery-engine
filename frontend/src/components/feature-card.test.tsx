// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FeatureCard,
  type FeatureStatus as FeatureCardStatus,
} from "./feature-card";

describe("FeatureCard", () => {
  describe("positive scenarios", () => {
    it("renders title and description", () => {
      render(
        <FeatureCard
          title="Shift-left compliance"
          description="Secrets and vulnerability scans before merge."
        />,
      );
      expect(
        screen.getByRole("heading", { name: "Shift-left compliance" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Secrets and vulnerability scans before merge."),
      ).toBeInTheDocument();
    });

    it("renders a ready badge when status is ready", () => {
      render(<FeatureCard title="Compliance" description="..." status="ready" />);
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("renders a coming-soon badge when status is coming-soon", () => {
      render(
        <FeatureCard title="Compliance" description="..." status="coming-soon" />,
      );
      expect(screen.getByText("Coming soon")).toBeInTheDocument();
    });
  });

  describe("negative scenarios", () => {
    it("renders no badge when status is omitted", () => {
      render(<FeatureCard title="Compliance" description="..." />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("renders no badge for an unexpected status value", () => {
      render(
        <FeatureCard
          title="Compliance"
          description="..."
          status={"unknown" as FeatureCardStatus}
        />,
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("renders no badge when status is null", () => {
      render(
        <FeatureCard title="Compliance" description="..." status={null as never} />,
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});