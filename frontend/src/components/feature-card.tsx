export type FeatureStatus = "ready" | "coming-soon";

type FeatureCardProps = {
  title: string;
  description: string;
  status?: FeatureStatus;
};

const STATUS_LABEL: Record<FeatureStatus, string> = {
  ready: "Ready",
  "coming-soon": "Coming soon",
};

export function FeatureCard({ title, description, status }: FeatureCardProps) {
  const label = status ? STATUS_LABEL[status] : undefined;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {label ? (
          <span
            role="status"
            className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300"
          >
            {label}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </section>
  );
}