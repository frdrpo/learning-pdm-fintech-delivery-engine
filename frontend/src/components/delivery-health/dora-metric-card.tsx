import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type DoraMetricCardProps = {
  label: string;
  value: string | null;
  detail: string;
  windowLabel: string;
};

export function DoraMetricCard({
  label,
  value,
  detail,
  windowLabel,
}: DoraMetricCardProps) {
  return (
    <Card as="section">
      <h3 className="text-sm font-medium uppercase tracking-wider text-slate-400">
        {label}
      </h3>
      {value !== null ? (
        <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Badge size="sm" tone="amber">
            Insufficient data
          </Badge>
        </div>
      )}
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
      <p className="mt-3 text-xs text-slate-500">Window: {windowLabel}</p>
    </Card>
  );
}