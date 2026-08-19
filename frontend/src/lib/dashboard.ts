import type { ComplianceControl } from "@/lib/compliance";
import type { GateSnapshot, TrainReadinessInput } from "@/lib/delivery";

export type FeatureRank = "ready" | "in-flight" | "blocked";

export type DashboardFeature = {
  name: string;
  description: string;
  rank: FeatureRank;
  train?: number;
};

export const DASHBOARD_GATES: GateSnapshot = {
  lint: "pass",
  test: "pass",
  build: "pass",
  compliance: "pass",
};

export const DASHBOARD_TRAIN: TrainReadinessInput = {
  featuresReady: 3,
  featuresTotal: 4,
  gateHealth: {
    lint: "pass",
    test: "pass",
    build: "pass",
    compliance: "pass",
  },
  daysUntilTrain: 5,
};

export const DASHBOARD_CONTROLS: ComplianceControl[] = [
  { id: "secrets", name: "Secret scanning (gitleaks / trufflehog)", status: "pass" },
  { id: "vulns", name: "Dependency scanning (OSV)", status: "pass" },
  { id: "sast", name: "Code-health & diff risk review", status: "pass" },
  { id: "regulatory", name: "Regulatory attestation", status: "pending" },
];

export const DASHBOARD_FEATURES: DashboardFeature[] = [
  {
    name: "Live verify target",
    description:
      "Pages site on demand — the release pipeline curls DEPLOY_VERIFY_URL after each promotion.",
    rank: "ready",
    train: 2,
  },
  {
    name: "Dev-staging-prod promotion",
    description:
      "Real Deployment API records with reviewer approvals on staging and production.",
    rank: "ready",
    train: 2,
  },
  {
    name: "Failure & recovery drill",
    description:
      "Controlled regression + rollback so CFR/MTTR compute real values from native records.",
    rank: "in-flight",
    train: 3,
  },
  {
    name: "Regulatory attestation",
    description: "Formal evidence pack for audit-gated environments.",
    rank: "blocked",
  },
];