import type { FeatureStatus } from "@/components/feature-card";

export type Feature = {
  title: string;
  description: string;
  status?: FeatureStatus;
};

export const FEATURES: Feature[] = [
  {
    title: "Risk & Code Health",
    description:
      "PR size tracking, code complexity analysis, and secret plus vulnerability scanning — all shift-left before merge.",
    status: "ready",
  },
  {
    title: "Compliance Guardrail",
    description:
      "Secret detection and regulatory compliance scanning enforced on every pull request via trufflehog.",
    status: "ready",
  },
  {
    title: "Quality Gate",
    description:
      "Actionlint plus lint, test, and build aggregated into a single required status check for branch protection.",
    status: "ready",
  },
  {
    title: "Release Pipeline",
    description:
      "Promote builds through development, staging, and production with dry-run deployment records.",
    status: "coming-soon",
  },
];