"use client";

import { useMemo, useState } from "react";
import { simulateReleaseTrain, type ReleaseTrainConfig } from "@/lib/release-train";

type PanelConfig = {
  capacity: number;
  gatePassRatePct: number;
  trainIntervalDays: number;
  seed: number;
};

const DEFAULT_PANEL: PanelConfig = {
  capacity: 3,
  gatePassRatePct: 100,
  trainIntervalDays: 14,
  seed: 42,
};

function toModelConfig(config: PanelConfig): ReleaseTrainConfig {
  return {
    trainIntervalDays: config.trainIntervalDays,
    capacity: config.capacity,
    gatePassRate: config.gatePassRatePct / 100,
    slipPolicy: "carry",
    seed: config.seed,
    maxTrains: 10,
    backlog: [
      { id: "feat-a", size: 2, readiness: 1 },
      { id: "feat-b", size: 3, readiness: 1 },
      { id: "feat-c", size: 1, readiness: 1 },
    ],
  };
}

export function SimulationPanel() {
  const [config, setConfig] = useState<PanelConfig>(DEFAULT_PANEL);

  const result = useMemo(
    () => simulateReleaseTrain(toModelConfig(config)),
    [config],
  );

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-white">
          Release train simulator
        </h2>
        <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-300">
          Simulated
        </span>
      </div>

      <form
        role="form"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Train capacity
          <select
            aria-label="Train capacity"
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-slate-100"
            value={config.capacity}
            onChange={(e) =>
              setConfig({ ...config, capacity: Number(e.target.value) })
            }
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} feature{n > 1 ? "s" : ""} per train
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Gate pass rate (%)
          <input
            aria-label="Gate pass rate"
            type="number"
            min={0}
            max={100}
            step={5}
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-slate-100"
            value={config.gatePassRatePct}
            onChange={(e) =>
              setConfig({
                ...config,
                gatePassRatePct: Number(e.target.value),
              })
            }
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Train interval (days)
          <input
            aria-label="Train interval"
            type="number"
            min={1}
            step={1}
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-slate-100"
            value={config.trainIntervalDays}
            onChange={(e) =>
              setConfig({ ...config, trainIntervalDays: Number(e.target.value) })
            }
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Seed
          <input
            aria-label="Seed"
            type="number"
            step={1}
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-slate-100"
            value={config.seed}
            onChange={(e) => setConfig({ ...config, seed: Number(e.target.value) })}
          />
        </label>
      </form>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <dt className="text-xs uppercase tracking-widest text-slate-400">
            On-time rate
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-emerald-300">
            {Math.round(result.onTimeRate * 100)}%
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <dt className="text-xs uppercase tracking-widest text-slate-400">
            Throughput
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">
            {Math.round(result.throughput * 100)}%
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <dt className="text-xs uppercase tracking-widest text-slate-400">
            Avg delay
          </dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">
            {result.averageDelayTrains.toFixed(1)} trains
          </dd>
        </div>
      </section>

      {result.trains.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
          No features boarded — the gate never passed for this configuration.
        </p>
      ) : (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">
            Simulated train schedule
          </h3>
          {result.trains.map((train) => (
            <article
              key={train.train}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <header className="flex items-center justify-between">
                <h4 className="font-medium text-slate-100">Train {train.train}</h4>
                <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300">
                  Kind: &quot;simulation&quot;
                </span>
              </header>
              <ul className="mt-3 flex flex-wrap gap-2">
                {train.features.map((id) => (
                  <li
                    key={id}
                    className="rounded-md border border-white/10 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
                  >
                    {id}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}