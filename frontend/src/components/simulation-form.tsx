export type PanelConfig = {
  capacity: number;
  gatePassRatePct: number;
  trainIntervalDays: number;
  seed: number;
};

type SimulationFormProps = {
  config: PanelConfig;
  onChange: (config: PanelConfig) => void;
};

export function SimulationForm({ config, onChange }: SimulationFormProps) {
  const update = (patch: Partial<PanelConfig>) =>
    onChange({ ...config, ...patch });

  return (
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
          onChange={(e) => update({ capacity: Number(e.target.value) })}
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
          onChange={(e) => update({ gatePassRatePct: Number(e.target.value) })}
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
          onChange={(e) => update({ trainIntervalDays: Number(e.target.value) })}
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
          onChange={(e) => update({ seed: Number(e.target.value) })}
        />
      </label>
    </form>
  );
}