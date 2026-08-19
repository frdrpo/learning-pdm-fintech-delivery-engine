import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FeatureStatus } from "@/lib/features";

export type { FeatureStatus } from "@/lib/features";

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
    <Card as="section">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {label ? (
          <Badge size="md" tone="green" label={label}>
            {label}
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </Card>
  );
}