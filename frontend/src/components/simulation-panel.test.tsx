// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimulationPanel } from "./simulation-panel";

describe("SimulationPanel", () => {
  describe("positive scenarios", () => {
    it("runs the model on mount and shows a train schedule", () => {
      render(<SimulationPanel />);
      expect(screen.getByRole("heading", { name: /train 1/i })).toBeInTheDocument();
      expect(screen.getByText("feat-a")).toBeInTheDocument();
      expect(screen.getByText("feat-b")).toBeInTheDocument();
      expect(screen.getByText("feat-c")).toBeInTheDocument();
    });

    it("shows the on-time rate summary", () => {
      render(<SimulationPanel />);
      const metric = screen.getByText(/on-time rate/i).closest("div");
      expect(metric).toHaveTextContent("100%");
    });

    it("spreads features across trains when capacity drops", () => {
      render(<SimulationPanel />);
      expect(screen.queryByRole("heading", { name: /train 2/i })).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/capacity/i), {
        target: { value: "1" },
      });
      expect(screen.getByRole("heading", { name: /train 1/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /train 2/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /train 3/i })).toBeInTheDocument();
    });
  });

  describe("negative scenarios", () => {
    it("boards nothing when the gate always fails", () => {
      render(<SimulationPanel />);
      fireEvent.change(screen.getByLabelText(/gate pass rate/i), {
        target: { value: "0" },
      });
      expect(screen.queryByRole("heading", { name: /train 1/i })).not.toBeInTheDocument();
      expect(screen.getByText(/no features boarded/i)).toBeInTheDocument();
    });

    it("keeps the simulated labeling visible on every output", () => {
      render(<SimulationPanel />);
      expect(screen.getAllByText(/simulated/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/kind: "simulation"/i).length).toBeGreaterThan(0);
    });
  });
});