import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SimulationResult } from "@/lib/release-train";

export function SimulationSchedule({ result }: { result: SimulationResult }) {
  if (result.trains.length === 0) {
    return (
      <Card className="text-sm text-slate-400">
        No features boarded — the gate never passed for this configuration.
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">
        Simulated train schedule
      </h3>
      {result.trains.map((train) => (
        <Card as="article" variant="tile" key={train.train}>
          <header className="flex items-center justify-between">
            <h4 className="font-medium text-slate-100">Train {train.train}</h4>
            <Badge size="sm" tone="violet" font="normal">
              Kind: &quot;simulation&quot;
            </Badge>
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
        </Card>
      ))}
    </section>
  );
}