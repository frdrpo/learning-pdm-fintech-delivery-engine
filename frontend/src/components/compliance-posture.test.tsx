// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompliancePosture, type ComplianceControl } from "./compliance-posture";

const controls: ComplianceControl[] = [
  { id: "secrets", name: "Secret scanning", status: "pass" },
  { id: "vulns", name: "Dependency vulnerabilities", status: "pass" },
  { id: "regulatory", name: "Regulatory controls", status: "pending" },
];

describe("CompliancePosture", () => {
  it("renders every control name", () => {
    render(<CompliancePosture controls={controls} />);
    expect(screen.getByText("Secret scanning")).toBeInTheDocument();
    expect(screen.getByText("Dependency vulnerabilities")).toBeInTheDocument();
    expect(screen.getByText("Regulatory controls")).toBeInTheDocument();
  });

  it("summarizes how many controls are green", () => {
    render(<CompliancePosture controls={controls} />);
    expect(
      screen.getByLabelText("2 of 3 controls green"),
    ).toBeInTheDocument();
  });

  it("labels passing controls with a pass badge", () => {
    render(<CompliancePosture controls={controls} />);
    expect(screen.getAllByRole("status", { name: "Pass" }).length).toBe(2);
  });

  it("labels pending controls as pending", () => {
    render(<CompliancePosture controls={controls} />);
    expect(screen.getAllByRole("status", { name: "Pending" }).length).toBe(1);
  });

  it("reports zero green when nothing passed yet", () => {
    render(
      <CompliancePosture
        controls={[
          { id: "a", name: "Secret scanning", status: "pending" },
          { id: "b", name: "Regulatory controls", status: "pending" },
        ]}
      />,
    );
    expect(screen.getByLabelText("0 of 2 controls green")).toBeInTheDocument();
  });
});