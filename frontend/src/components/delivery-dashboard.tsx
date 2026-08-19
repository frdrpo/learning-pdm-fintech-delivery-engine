import {
  ALL_GATES,
  aggregateGate,
  assessTrainReadiness,
  blockedGates,
  type GateSnapshot,
  type GateState,
  type TrainReadiness,
  type TrainReadinessInput,
} from "@/lib/delivery";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const READINESS_LABEL: Record<TrainReadiness, string> = {
  "on-schedule": "On schedule",
  "at-risk": "At risk",
  slipped: "Slipped",
};

const GATE_LABEL: Record<GateState, string> = {
  pass: "Pass",
  fail: "Fail",
  pending: "Pending",
};

const GATE_TONE: Record<GateState, BadgeTone> = {
  pass: "green",
  fail: "rose",
  pending: "amber",
};

type DeliveryDashboardProps = {
  gates: GateSnapshot;
  train: TrainReadinessInput;
};

export function DeliveryDashboard({ gates, train }: DeliveryDashboardProps) {
  const overall = aggregateGate(gates);
  const readiness = assessTrainReadiness(train);
  const blocked = blockedGates(train.gateHealth);

  return (
    <section className="w-full max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-white">
          Delivery dashboard
        </h2>
        <Badge size="md" tone="cyan" label={READINESS_LABEL[readiness]}>
          {READINESS_LABEL[readiness]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <h3 className="text-lg font-semibold text-white">
            Quality gates ({overall})
          </h3>
          <ul className="mt-4 space-y-3">
            {ALL_GATES.map((name) => {
              const state = gates[name] ?? "pending";
              return (
                <li key={name}>
                  <Card variant="row">
                    <span className="text-sm text-slate-200">{name}</span>
                    <Badge size="sm" tone={GATE_TONE[state]}>
                      {GATE_LABEL[state]}
                    </Badge>
                  </Card>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card as="section">
          <h3 className="text-lg font-semibold text-white">Next train</h3>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-400">Features ready</dt>
              <dd className="text-sm font-medium text-slate-100">
                {train.featuresReady} of {train.featuresTotal}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-400">Days until boarding</dt>
              <dd className="text-sm font-medium text-slate-100">
                {train.daysUntilTrain}
              </dd>
            </div>
          </dl>
          {blocked.length > 0 ? (
            <Card className="mt-4 text-sm" variant="notice-rose">
              Blocked by: {blocked.join(", ")}
            </Card>
          ) : (
            <Card className="mt-4 text-sm" variant="notice-green">
              No blockers — features can board on time.
            </Card>
          )}
        </Card>
      </div>
    </section>
  );
}