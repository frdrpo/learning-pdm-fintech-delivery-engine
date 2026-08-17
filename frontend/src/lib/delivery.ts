export type GateName = "lint" | "test" | "build" | "compliance";

export const ALL_GATES: GateName[] = ["lint", "test", "build", "compliance"];

export function isReadyForRelease(
  gates: Partial<Record<GateName, boolean>>,
): boolean {
  return ALL_GATES.every((name) => gates[name] === true);
}