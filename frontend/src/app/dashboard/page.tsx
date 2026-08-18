import type { Metadata } from "next";
import { CompliancePosture } from "@/components/compliance-posture";
import { DeliveryDashboard } from "@/components/delivery-dashboard";
import { FeatureStatusCard } from "@/components/feature-status-card";
import { TrainBoard } from "@/components/train-board";
import {
  boardingTrain,
  buildTrainCalendar,
  daysUntilDate,
} from "@/lib/train-board";

export const metadata: Metadata = {
  title: "Delivery Dashboard",
  description:
    "A delivery-readiness view: quality gates, the release-train calendar, compliance posture, and feature boarding status.",
};

const TRAIN_CALENDAR = (() => {
  const now = new Date();
  const slots = buildTrainCalendar({
    anchor: new Date("2026-08-17T10:33:21.000Z"),
    now,
    intervalDays: 14,
    cutoffDays: 3,
    count: 3,
    releaseDates: [
      { tag: "v0.1.0", publishedAt: new Date("2026-08-17T10:33:21.000Z") },
      { tag: "v0.2.0", publishedAt: new Date("2026-08-18T02:39:39.000Z") },
    ],
  });
  return { slots, now, boarding: boardingTrain(slots) };
})();

const SNAPSHOT = {
  gates: {
    lint: "pass",
    test: "pass",
    build: "pass",
    compliance: "pass",
  } as const,
  train: {
    featuresReady: 3,
    featuresTotal: 4,
    gateHealth: {
      lint: "pass",
      test: "pass",
      build: "pass",
      compliance: "pass",
    } as const,
    daysUntilTrain: TRAIN_CALENDAR.boarding
      ? daysUntilDate(TRAIN_CALENDAR.boarding.departure, TRAIN_CALENDAR.now)
      : 0,
  },
};

const CONTROLS = [
  { id: "secrets", name: "Secret scanning (gitleaks / trufflehog)", status: "pass" },
  { id: "vulns", name: "Dependency scanning (OSV)", status: "pass" },
  { id: "sast", name: "Code-health & diff risk review", status: "pass" },
  { id: "regulatory", name: "Regulatory attestation", status: "pending" },
] as const;

const FEATURES = [
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
] as const;

export default function DashboardPage() {
  return (
    <>
      <header className="mx-auto w-full max-w-5xl px-6 pt-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Delivery dashboard
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          A single view of what is ready to board the next release train and
          what is blocking it.
        </p>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <DeliveryDashboard gates={SNAPSHOT.gates} train={SNAPSHOT.train} />
        <section className="mt-8">
          <TrainBoard
            slots={TRAIN_CALENDAR.slots}
            now={TRAIN_CALENDAR.now}
            readiness={SNAPSHOT.train}
          />
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <CompliancePosture controls={CONTROLS} />
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white">
              Feature boarding status
            </h3>
            <div className="mt-4 grid gap-4">
              {FEATURES.map((feature) => (
                <FeatureStatusCard key={feature.name} {...feature} />
              ))}
            </div>
          </section>
        </section>
        <p className="mt-8 text-center text-xs text-slate-500">
          Sample snapshot for illustration — the live view is generated from
          GitHub-native delivery records by scripts/delivery-telemetry.mjs.
          Train windows follow the ADR 0009 calendar (anchored 2026-08-17,
          14-day interval, 3-day readiness cutoff).
        </p>
      </main>
      <footer className="border-t border-white/10 py-10 text-center text-sm text-slate-500">
        PDM reference implementation — telemetry is read from real events, never
        invented.
      </footer>
    </>
  );
}