import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FeatureRank } from "@/lib/dashboard";

export type { FeatureRank } from "@/lib/dashboard";

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

const RANK_TONE: Record<FeatureRank, BadgeTone> = {
  ready: "green",
  "in-flight": "cyan",
  blocked: "rose",
};

export function FeatureStatusCard({
  name,
  description,
  rank,
  train,
}: FeatureStatusCardProps) {
  return (
    <Card as="section">
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-base font-semibold text-white">{name}</h4>
        <div className="flex items-center gap-2">
          {train !== undefined ? (
            <Badge size="sm" tone="neutral" font="normal">
              Train {train}
            </Badge>
          ) : null}
          <Badge size="sm" tone={RANK_TONE[rank]} label={RANK_LABEL[rank]}>
            {RANK_LABEL[rank]}
          </Badge>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </Card>
  );
}