import { Card } from "@/components/ui/card";
import type { SimulationResult } from "@/lib/release-train";

export function SimulationMetrics({ result }: { result: SimulationResult }) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <Card variant="tile">
        <dt className="text-xs uppercase tracking-widest text-slate-400">
          On-time rate
        </dt>
        <dd className="mt-2 text-2xl font-semibold text-emerald-300">
          {Math.round(result.onTimeRate * 100)}%
        </dd>
      </Card>
      <Card variant="tile">
        <dt className="text-xs uppercase tracking-widest text-slate-400">
          Throughput
        </dt>
        <dd className="mt-2 text-2xl font-semibold text-slate-100">
          {Math.round(result.throughput * 100)}%
        </dd>
      </Card>
      <Card variant="tile">
        <dt className="text-xs uppercase tracking-widest text-slate-400">
          Avg delay
        </dt>
        <dd className="mt-2 text-2xl font-semibold text-slate-100">
          {result.averageDelayTrains.toFixed(1)} trains
        </dd>
      </Card>
    </section>
  );
}