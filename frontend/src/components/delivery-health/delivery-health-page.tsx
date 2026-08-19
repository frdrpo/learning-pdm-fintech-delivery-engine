import { AuditTrailTable } from "@/components/delivery-health/audit-trail-table";
import { DoraMetricsGrid } from "@/components/delivery-health/dora-metrics-grid";
import { ReleaseTrainPanel } from "@/components/delivery-health/release-train-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/delivery-health/format";
import { isSnapshotStale } from "@/lib/delivery-health/snapshot";
import type { DeliverySnapshot } from "@/lib/delivery-health/types";

type DeliveryHealthPageProps = {
  snapshot: DeliverySnapshot | null;
  now?: string;
};

export function DeliveryHealthPage({
  snapshot,
  now = new Date().toISOString(),
}: DeliveryHealthPageProps) {
  if (!snapshot) {
    return (
      <Card as="section">
        <h2 className="text-2xl font-semibold text-white">
          Delivery health — no snapshot
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          No delivery snapshot is committed in this build. Run{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">
            scripts/delivery-telemetry.mjs
          </code>{" "}
          against a repo with real delivery activity and commit the export as{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">
            frontend/src/lib/delivery-health/delivery-snapshot.json
          </code>{" "}
          to populate this page. Numbers are never invented — an absent snapshot
          renders an explicit empty state.
        </p>
      </Card>
    );
  }

  const stale = isSnapshotStale(snapshot, 30, new Date(now));
  const deliveredTrains = snapshot.audit.release_trains
    .filter((t) => t.delivered)
    .map((t) => t.train);

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-white">Delivery health</h2>
        {stale ? (
          <Badge size="md" tone="amber">
            Stale snapshot
          </Badge>
        ) : (
          <Badge size="md" tone="green">
            Live snapshot
          </Badge>
        )}
      </div>
      <p className="text-sm text-slate-400">
        Generated {formatDate(snapshot.generated_at)} from GitHub-native delivery
        records — deployments, releases, merged PRs, and failure events.
      </p>

      <DoraMetricsGrid metrics={snapshot.metrics} />
      <ReleaseTrainPanel
        onTime={snapshot.metrics.release_train_on_time}
        deliveredTrains={deliveredTrains}
        now={now}
      />
      <AuditTrailTable audit={snapshot.audit} />
    </div>
  );
}