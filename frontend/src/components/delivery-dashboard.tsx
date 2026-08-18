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
        <h2 className="text-2xl font-semibold text-white">Delivery dashboard</h2>
        <span
          role="status"
          aria-label={READINESS_LABEL[readiness]}
          className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300"
        >
          {READINESS_LABEL[readiness]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">
            Quality gates ({overall})
          </h3>
          <ul className="mt-4 space-y-3">
            {ALL_GATES.map((name) => {
              const state = gates[name] ?? "pending";
              return (
                <li
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-4 py-2.5"
                >
                  <span className="text-sm text-slate-200">{name}</span>
                  <span
                    role="status"
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      state === "pass"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : state === "fail"
                          ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    }`}
                  >
                    {GATE_LABEL[state]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
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
            <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-200">
              Blocked by: {blocked.join(", ")}
            </p>
          ) : (
            <p className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-200">
              No blockers — features can board on time.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}