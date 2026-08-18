export type FeatureRank = "ready" | "in-flight" | "blocked";

export type FeatureStatusCardProps = {
  name: string;
  description: string;
  rank: FeatureRank;
  train?: number;
};

const RANK_LABEL: Record<FeatureRank, string> = {
  ready: "Ready",
  "in-flight": "In flight",
  blocked: "Blocked",
};

const RANK_ACCENT: Record<FeatureRank, string> = {
  ready: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  "in-flight": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

export function FeatureStatusCard({
  name,
  description,
  rank,
  train,
}: FeatureStatusCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-base font-semibold text-white">{name}</h4>
        <div className="flex items-center gap-2">
          {train !== undefined ? (
            <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-slate-400">
              Train {train}
            </span>
          ) : null}
          <span
            role="status"
            aria-label={RANK_LABEL[rank]}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${RANK_ACCENT[rank]}`}
          >
            {RANK_LABEL[rank]}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </section>
  );
}