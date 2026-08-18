export type GateName = "lint" | "test" | "build" | "compliance";

export const ALL_GATES: GateName[] = ["lint", "test", "build", "compliance"];

export function isReadyForRelease(
  gates: Partial<Record<GateName, boolean>>,
): boolean {
  return ALL_GATES.every((name) => gates[name] === true);
}

export type GateState = "pass" | "fail" | "pending";

export type GateSnapshot = Partial<Record<GateName, GateState>>;

export function aggregateGate(gates: GateSnapshot): GateState {
  const states = ALL_GATES.map((name) => gates[name]);
  if (states.includes("fail")) return "fail";
  if (states.includes("pending") || states.includes(undefined)) {
    return "pending";
  }
  return "pass";
}

export type TrainReadiness = "on-schedule" | "at-risk" | "slipped";

export type TrainReadinessInput = {
  featuresReady: number;
  featuresTotal: number;
  gateHealth: GateSnapshot;
  daysUntilTrain: number;
};

export function assessTrainReadiness(input: TrainReadinessInput): TrainReadiness {
  const failedGate = ALL_GATES.some((name) => input.gateHealth[name] === "fail");
  const pendingGate = ALL_GATES.some(
    (name) =>
      input.gateHealth[name] === "pending" || input.gateHealth[name] === undefined,
  );
  const allFeaturesReady =
    input.featuresTotal === 0 || input.featuresReady >= input.featuresTotal;

  if (failedGate || pendingGate) return "at-risk";
  if (input.daysUntilTrain <= 0) {
    return allFeaturesReady ? "on-schedule" : "slipped";
  }
  return "on-schedule";
}

export function blockedGates(gates: GateSnapshot): GateName[] {
  return ALL_GATES.filter((name) => gates[name] === "fail");
}