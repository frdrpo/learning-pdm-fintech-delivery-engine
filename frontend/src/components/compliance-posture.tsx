export type ControlStatus = "pass" | "pending";

export type ComplianceControl = {
  id: string;
  name: string;
  status: ControlStatus;
};

const CONTROL_LABEL: Record<ControlStatus, string> = {
  pass: "Pass",
  pending: "Pending",
};

type CompliancePostureProps = {
  controls: readonly ComplianceControl[];
};

export function CompliancePosture({ controls }: CompliancePostureProps) {
  const green = controls.filter((control) => control.status === "pass").length;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold text-white">Compliance posture</h3>
      <p
        className="mt-2 text-sm text-slate-400"
        aria-label={`${green} of ${controls.length} controls green`}
      >
        {green} of {controls.length} controls green — shift-left by default.
      </p>
      <ul className="mt-4 space-y-3">
        {controls.map((control) => (
          <li
            key={control.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-4 py-2.5"
          >
            <span className="text-sm text-slate-200">{control.name}</span>
            <span
              role="status"
              aria-label={CONTROL_LABEL[control.status]}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                control.status === "pass"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
              }`}
            >
              {CONTROL_LABEL[control.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}